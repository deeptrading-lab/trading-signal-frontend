/**
 * `/api/stock/snapshot` BFF route — 경량 종목 스냅샷(밸류트랩 룰용).
 *
 * 브라우저/봇 → 본 route handler → KIS REST 단방향. 직접 KIS 호출 금지(AGENTS.md BFF 원칙).
 *
 * PRD `value-picks-validated` §3-A (docs/prd/value-picks-validated.md, dev-manager-bot 레포):
 *   - GET ?ticker=<6자리> → `StockSnapshot`(현재가·52주·시총·외국인지분·기술적·수급추세 합성).
 *   - value_picks 봇이 후보당 1회 호출해 결정적·저비용 룰을 돌린다 — 여러 read TR 을 한 번에 묶음.
 *
 * ## 합성하는 KIS TR (레이트리밋 고려 — 후보당 최대 4 TR)
 *   1. inquire-price(FHKST01010100)   — 현재가·거래량·외국인지분·상장주수.
 *   2. inquire-daily-itemchartprice   — 일봉(~1년, 청크 분할). 52주·이평/RSI/ADX/모멘텀.
 *      (FHKST03010100, 1년 ≒ 3 청크 콜)
 *   3. inquire-investor(FHKST01010900) — 종목별 N일 수급(기관/외국인 순매수).
 *   4. search-stock-info(CTPF1002R)    — 시장 구분(KOSPI/KOSDAQ). ⚠️ prod 전용 → vts/미설정은 생략·null.
 *
 * ## 컨벤션 (§3-A-3)
 *   - `isKisConfigured()` 미설정 → mock + `X-Data-Source: mock`.
 *   - `ticker` 미지정 → 400.
 *   - 내부 KIS 호출은 **병렬**(`Promise.allSettled`). 전체 라우트 타임아웃 **8초**(`withTimeout`).
 *     봇 측 후보당 호출 타임아웃(PRD §3-B-2, 8초)과 정합.
 *   - **부분 실패 허용**: 일봉/수급/시장 중 일부 TR 실패해도 200 + 산출 가능 필드만, 실패 필드 null,
 *     `X-Data-Source: kis-partial`. 현재가(가격 그룹) 전부 실패면 산출 불가 → 502/에러.
 *   - 전체 타임아웃 → mock + `X-Data-Source: mock-timeout`.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchStockPriceWithShares,
  fetchStockInfo,
  isKisConfigured,
  resolveKisEnv,
} from "@/lib/api/kis";
import { fetchDailyChunked, toYyyymmdd, addDays } from "@/lib/api/kis/chartChunked";
import type { StockDailyCandle, StockInfo, StockPrice } from "@/lib/api/kis/types";
import { fetchInvestorTrend } from "@/lib/api/kis/investor-flow";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";
import type { SnapshotMarket } from "@/lib/types/stock/snapshot";
import { isApiError } from "@/lib/api/errors";
import { getMockStockSnapshot } from "@/lib/mock/stock/snapshot";
import { getSymbolName } from "@/lib/api/kis";
import { assembleSnapshot } from "@/lib/server/stock/snapshot";
import {
  withTimeout,
  jsonWithDataSource,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

/** 전체 라우트 타임아웃 — 봇 후보당 호출 타임아웃(PRD §3-B-2, 8초)과 정합. */
const BFF_TIMEOUT_MS = 8_000;
/** 일봉 조회 범위(캘린더일) — 52주(≒365) + 이평/ADX 워밍업 여유. */
const CHART_LOOKBACK_DAYS = 400;
const TICKER_RE = /^\d{6}$/;

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
  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json(
      { error: "ticker 는 6자리 종목코드여야 합니다." },
      { status: 400 },
    );
  }

  // 환경변수 미설정 → mock fallback.
  if (!isKisConfigured()) {
    return jsonWithDataSource(getMockStockSnapshot(ticker), "mock");
  }

  try {
    return await withTimeout(buildSnapshotResponse(ticker), BFF_TIMEOUT_MS);
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

/**
 * 병렬 KIS 호출 + 부분 실패 합성. 가격(현재가) 그룹이 실패하면 에러를 던져(전부 실패 취급)
 * route 가 502 로 변환. 그 외 그룹 실패는 null + `kis-partial` 로 흡수.
 */
async function buildSnapshotResponse(ticker: string): Promise<NextResponse> {
  const env = resolveKisEnv();
  const toDate = toYyyymmdd(new Date());
  const fromDate = toYyyymmdd(addDays(new Date(), -CHART_LOOKBACK_DAYS));

  // search-stock-info 는 prod 전용(§3-A 데이터 출처) — vts 에선 시장 구분을 생략(null).
  const infoPromise: Promise<StockInfo | null> =
    env === "prod" ? fetchStockInfo(ticker) : Promise.resolve(null);

  const [priceResult, chartResult, investorResult, infoResult] =
    await Promise.allSettled([
      fetchStockPriceWithShares(ticker),
      fetchDailyChunked(ticker, fromDate, toDate),
      fetchInvestorTrend(ticker),
      infoPromise,
    ]);

  // 가격 그룹 — 스냅샷의 기준(현재가). 실패면 산출 불가 → 전체 실패 취급.
  if (priceResult.status !== "fulfilled") {
    throw priceResult.reason;
  }
  const price: StockPrice = priceResult.value.price;
  const listedShares: number | null = priceResult.value.listedShares;

  const candles: StockDailyCandle[] | null =
    chartResult.status === "fulfilled" ? chartResult.value : null;
  const investors: StockInvestorTrend | null =
    investorResult.status === "fulfilled" ? investorResult.value : null;
  const market: SnapshotMarket =
    infoResult.status === "fulfilled" ? toSnapshotMarket(infoResult.value) : null;

  const snapshot = assembleSnapshot({
    ticker,
    price,
    listedShares,
    candles,
    investors,
    market,
    fallbackName: getSymbolName(ticker) ?? undefined,
  });

  // 비핵심 그룹(일봉/수급/시장) 중 하나라도 실패면 부분 신호.
  const partial =
    chartResult.status !== "fulfilled" ||
    investorResult.status !== "fulfilled" ||
    infoResult.status !== "fulfilled";

  return jsonWithDataSource(snapshot, partial ? "kis-partial" : "kis", {
    "X-KIS-Env": env,
  });
}

/** StockInfo.market → 스냅샷 시장(KOSPI/KOSDAQ 외/미상 = null). */
function toSnapshotMarket(info: StockInfo | null): SnapshotMarket {
  if (!info) return null;
  if (info.market === "KOSPI" || info.market === "KOSDAQ") return info.market;
  return null;
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  // 전체 타임아웃 → mock degrade + 한글 안내.
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    return jsonWithDataSource(getMockStockSnapshot(ticker), "mock-timeout", {
      "X-Error": FALLBACK_TIMEOUT_MESSAGE,
    });
  }

  // 가격 그룹 비즈니스/네트워크 에러 — 한글 msg 통과(기존 패턴).
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
