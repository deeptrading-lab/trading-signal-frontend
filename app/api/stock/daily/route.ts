/**
 * `/api/stock/daily` BFF route — KIS 일자별 시세 프록시.
 *
 * PRD `stock-api-integration` §3.3.1, AC-1.
 *
 * - GET ?ticker=005930&period=D|W|M → 일자별 시세 (최근 N영업일).
 * - period 기본값 "D".
 * - 환경변수 미설정 / 타임아웃 시 mock fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchStockDaily,
  isKisConfigured,
  resolveKisEnv,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockStockDaily } from "@/lib/mock/stock/daily";

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  const rawPeriod = (
    request.nextUrl.searchParams.get("period") ?? "D"
  ).toUpperCase();
  const period: "D" | "W" | "M" =
    rawPeriod === "W" || rawPeriod === "M" ? rawPeriod : "D";

  if (!ticker) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  if (!isKisConfigured()) {
    return jsonWithDataSource(getMockStockDaily(ticker), "mock");
  }

  try {
    const data = await withTimeout(fetchStockDaily(ticker, period), 5_000);
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
  if (error instanceof Error && error.message === "__BFF_TIMEOUT__") {
    return jsonWithDataSource(getMockStockDaily(ticker), "mock-timeout", {
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
