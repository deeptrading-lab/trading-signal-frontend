/**
 * `/api/stock/chart-minute` BFF route — 당일 분봉 차트(디버그/수동 표면).
 *
 * `inquire-time-itemchartprice`(FHKST03010200) 경유, 1분봉 역방향 페이징 후 N분봉 리샘플.
 *
 * GET ?ticker=005930&timeframe=5&bars=78
 *   - timeframe: 분봉 단위(분). 기본 5, 허용 1/3/5/15.
 *   - bars     : 반환 N분봉 상한. 기본 78(≈한 세션 5분봉).
 *   - 응답     : StockMinuteCandle[] 오름차순(date="YYYY-MM-DDTHH:mm").
 *
 * ⚠️ 라이브 단타 루프는 이 라우트가 아니라 lib 함수(`fetchTodayMinuteCandles`/`fetchMinuteHistory`)를
 *    직접 호출한다. 본 라우트는 사람이 분봉을 눈으로 확인하는 디버그 용도.
 */

import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { fetchTodayMinuteCandles } from "@/lib/api/kis/minuteChartChunked";
import { isApiError } from "@/lib/api/errors";
import { getMockStockMinuteChart } from "@/lib/mock/stock/minute";
import { withTimeout, BFF_TIMEOUT_SENTINEL } from "@/lib/server/bffUtils";
import { trackMarketDataSource } from "@/lib/api/marketdata/source";

/** 분봉 페이징은 콜이 많아 타임아웃을 넉넉히. */
const BFF_TIMEOUT_MS = 20_000;
const DEFAULT_TIMEFRAME = 5;
const DEFAULT_BARS = 78;
const MAX_BARS = 400;
const VALID_TIMEFRAMES = new Set([1, 3, 5, 15]);

const FALLBACK_TIMEOUT_MESSAGE = "KIS 분봉 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  const rawTf = parseInt(request.nextUrl.searchParams.get("timeframe") ?? "", 10);
  const timeframe = VALID_TIMEFRAMES.has(rawTf) ? rawTf : DEFAULT_TIMEFRAME;
  const rawBars = parseInt(request.nextUrl.searchParams.get("bars") ?? "", 10);
  const bars = Number.isFinite(rawBars) && rawBars > 0 ? Math.min(rawBars, MAX_BARS) : DEFAULT_BARS;

  if (!ticker) {
    return NextResponse.json({ error: "ticker query parameter 가 필요합니다." }, { status: 400 });
  }

  if (!isKisConfigured()) {
    return jsonOk(getMockStockMinuteChart(ticker, timeframe, bars), "mock");
  }

  try {
    // 1분봉 페이징 → 리샘플 → 최신 bars개만.
    const { result: all, servedSource } = await trackMarketDataSource(() =>
      withTimeout(
        fetchTodayMinuteCandles(ticker, timeframe, bars * timeframe + timeframe),
        BFF_TIMEOUT_MS,
      ),
    );
    const candles = all.slice(-bars);
    return jsonOk(candles, servedSource ?? "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    return mapErrorToResponse(error, ticker, timeframe, bars);
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

function mapErrorToResponse(
  error: unknown,
  ticker: string,
  timeframe: number,
  bars: number,
): NextResponse {
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    return jsonOk(getMockStockMinuteChart(ticker, timeframe, bars), "mock-timeout", {
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
