/**
 * `/api/stock/price` BFF route.
 *
 * 브라우저 → 본 route handler → KIS REST 단방향 흐름. 직접 호출 금지.
 *
 * PRD `stock-api-integration` §3.3.1, AC-1, AC-7:
 *   - GET ?ticker=005930 → 현재가
 *   - 환경변수 미설정 시 mock 반환 + `X-Data-Source: mock`.
 *   - 4xx 메시지 통과, 5xx 한글 fallback.
 *   - 5s 타임아웃 (api-integration-dev 안정성 의무).
 *
 * 단일 ticker 만 받음 — multi-price 는 후속 PRD.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchStockPrice,
  getSymbolName,
  isKisConfigured,
  resolveKisEnv,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockStockPrice } from "@/lib/mock/stock/price";
import type { StockPrice } from "@/lib/api/kis/types";
import {
  withTimeout,
  jsonWithDataSource,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import { trackMarketDataSource } from "@/lib/api/marketdata/source";

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  if (!ticker) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  // 환경변수 미설정 → mock fallback.
  if (!isKisConfigured()) {
    return jsonWithDataSource(getMockStockPrice(ticker), "mock");
  }

  try {
    // route handler 자체 timeout 가드 (BFF 5s) — Promise.race.
    // X-Data-Source 는 실제 서빙 소스(toss/kis — 폴백 반영, trackMarketDataSource 주석).
    const { result: data, servedSource } = await trackMarketDataSource(() =>
      withTimeout(fetchStockPrice(ticker), 5_000),
    );
    return jsonWithDataSource(withSeedName(data, ticker), servedSource ?? "kis", {
      "X-KIS-Env": resolveKisEnv(),
    });
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

/**
 * 종목명 보강 — KIS `hts_kor_isnm` 은 prod 에서도 빈 값 케이스가 있어 `mapStockPrice` 가 ticker 로
 * 폴백한다(reference_kis-api-conventions §1). 이름이 ticker 그대로면 시드(symbols.json, 서버 전용,
 * 클라 번들 비용 0)에서 보강 → Top10 클릭·딥링크 등 검색을 안 거친 진입에서도 헤더에 종목명이 뜬다.
 */
function withSeedName(data: StockPrice, ticker: string): StockPrice {
  if (data.name && data.name !== ticker) return data;
  const seedName = getSymbolName(ticker);
  return seedName ? { ...data, name: seedName } : data;
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  // 타임아웃 → 502 + 한글 fallback + mock 반환 (graceful degrade).
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    return jsonWithDataSource(getMockStockPrice(ticker), "mock-timeout", {
      "X-Error": FALLBACK_TIMEOUT_MESSAGE,
    });
  }

  if (isApiError(error)) {
    return NextResponse.json(
      { error: error.message, detail: error.detail },
      {
        status: error.status && error.status >= 400 ? error.status : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    { error: "KIS 서버 일시 오류. 잠시 후 다시 시도해주세요." },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
