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
  isKisConfigured,
  resolveKisEnv,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockStockPrice } from "@/lib/mock/stock/price";

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
    const data = await withTimeout(fetchStockPrice(ticker), 5_000);
    return jsonWithDataSource(data, "kis", {
      "X-KIS-Env": resolveKisEnv(),
    });
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

function jsonWithDataSource(
  data: unknown,
  source: "mock" | "kis" | "mock-timeout",
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "X-Data-Source": source,
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {}),
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("__BFF_TIMEOUT__")), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  // 타임아웃 → 502 + 한글 fallback + mock 반환 (graceful degrade).
  if (error instanceof Error && error.message === "__BFF_TIMEOUT__") {
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
