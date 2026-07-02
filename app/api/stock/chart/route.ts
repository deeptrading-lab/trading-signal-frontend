/**
 * `/api/stock/chart` BFF route — 기간별 차트 시세.
 *
 * `inquire-daily-itemchartprice`(FHKST03010100) 경유.
 *
 * GET ?ticker=005930&days=100&period=D|W|M
 *   - days  : 오늘 기준 과거 N 캘린더일 (기본 100, 최대 3000)
 *   - period: D(일봉) / W(주봉) / M(월봉), 기본 D
 *   - 응답  : StockDailyCandle[] 오름차순(오래된 날 먼저)
 *
 * 일봉 + 긴 기간(days > DAILY_CHUNK_DAYS): KIS 1회 100봉 한도 초과 방지를 위해
 * 130일 단위로 청크 분할 순차 호출 후 합산·중복제거.
 * 청크 간 150ms 지연으로 EGW00201 회피.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchStockDailyChart, isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockStockChart } from "@/lib/mock/stock/daily";
import { withTimeout, BFF_TIMEOUT_SENTINEL } from "@/lib/server/bffUtils";
import { trackMarketDataSource } from "@/lib/api/marketdata/source";
import { fetchDailyChunked, CHUNK_DAYS as DAILY_CHUNK_DAYS, toYyyymmdd, addDays } from "@/lib/api/kis/chartChunked";

/** 일봉 1년 = ~3콜, 타임아웃을 넉넉히. */
const BFF_TIMEOUT_MS = 12_000;
const DEFAULT_DAYS = 100;
const MAX_DAYS = 3_000;

const VALID_PERIODS = new Set(["D", "W", "M"]);
type KisPeriod = "D" | "W" | "M";

const FALLBACK_TIMEOUT_MESSAGE = "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  const rawDays = parseInt(request.nextUrl.searchParams.get("days") ?? "", 10);
  const days = Number.isFinite(rawDays) && rawDays > 0
    ? Math.min(rawDays, MAX_DAYS)
    : DEFAULT_DAYS;
  const rawPeriod = (request.nextUrl.searchParams.get("period") ?? "D").toUpperCase();
  const period: KisPeriod = VALID_PERIODS.has(rawPeriod) ? (rawPeriod as KisPeriod) : "D";

  if (!ticker) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  if (!isKisConfigured()) {
    return jsonOk(getMockStockChart(ticker), "mock");
  }

  const toDate = toYyyymmdd(new Date());
  const fromDate = toYyyymmdd(addDays(new Date(), -days));

  try {
    const { result: candles, servedSource } = await trackMarketDataSource(() => {
      const fetch =
        period === "D" && days > DAILY_CHUNK_DAYS
          ? fetchDailyChunked(ticker, fromDate, toDate)
          : fetchStockDailyChart(ticker, fromDate, toDate, period).then((c) =>
              c.slice().sort((a, b) => a.date.localeCompare(b.date)),
            );
      return withTimeout(fetch, BFF_TIMEOUT_MS);
    });
    return jsonOk(candles, servedSource ?? "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

function jsonOk(
  data: unknown,
  source: string,
  extra?: Record<string, string>,
): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: { "X-Data-Source": source, "Cache-Control": "no-store", ...(extra ?? {}) },
  });
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    return jsonOk(getMockStockChart(ticker), "mock-timeout", {
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
