/**
 * `/api/stock/chart-minute` BFF route — 분봉 차트(디버그/수동 표면).
 *
 * GET ?ticker=005930&timeframe=5&bars=78
 *   - timeframe : 분봉 단위(분). 기본 5, 허용 1/3/5/10/15.
 *   - bars      : 반환 N분봉 상한(당일 경로만). 기본 78(≈한 세션 5분봉).
 *   - priorDays : 과거 거래일 수. 0=당일 한 세션(기본), >0=멀티데이(최대 20=1개월).
 *   - 응답      : StockMinuteCandle[] 오름차순(date="YYYY-MM-DDTHH:mm").
 *
 * 데이터 소스(priorDays 로 분기):
 *   - priorDays=0 : `fetchTodayMinuteCandles` — `inquire-time-itemchartprice`(FHKST03010200) 1분봉
 *                   역방향 페이징 후 N분봉 리샘플. 당일 한 세션.
 *   - priorDays>0 : `fetchMinuteHistory` — 과거 `priorDays` 세션 + 당일을 합산·리샘플
 *                   (KIS FHKST03010230 / TOSS `fetchMinuteHistoryToss`). ⚠️ 호출량이 큼
 *                   (거래일당 다수 콜, 1개월 1분봉 ≈ 수천 봉) → 타임아웃/`maxDuration` 을 넉넉히.
 *
 * ⚠️ 라이브 단타 루프는 이 라우트가 아니라 lib 함수(`fetchTodayMinuteCandles`/`fetchMinuteHistory`)를
 *    직접 호출한다. 본 라우트는 사람이 분봉을 눈으로 확인하는 디버그/차트 용도.
 */

import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import {
  fetchMinuteHistory,
  fetchTodayMinuteCandles,
} from "@/lib/api/kis/minuteChartChunked";
import { isApiError } from "@/lib/api/errors";
import { getMockStockMinuteChart } from "@/lib/mock/stock/minute";
import { withTimeout, BFF_TIMEOUT_SENTINEL } from "@/lib/server/bffUtils";
import { trackMarketDataSource } from "@/lib/api/marketdata/source";

/** 멀티데이 분봉은 세션마다 페이징이라 콜이 많다 — 서버리스 상한을 넉넉히. */
export const maxDuration = 60;

/** 당일 페이징 타임아웃. */
const BFF_TIMEOUT_MS = 20_000;
/** 멀티데이 페이징 타임아웃 — 거래일 수만큼 콜이 누적돼 더 넉넉히. */
const BFF_TIMEOUT_MS_MULTI = 55_000;
const DEFAULT_TIMEFRAME = 5;
const DEFAULT_BARS = 78;
const MAX_BARS = 400;
const VALID_TIMEFRAMES = new Set([1, 3, 5, 10, 15]);
/** 멀티데이 과거 거래일 상한 — 1개월(20거래일). 그 이상은 콜/봉 수가 비현실적(MINUTE_PERIODS 정합). */
const MAX_PRIOR_DAYS = 20;

const FALLBACK_TIMEOUT_MESSAGE = "KIS 분봉 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ticker = (params.get("ticker") ?? "").trim();
  const rawTf = parseInt(params.get("timeframe") ?? "", 10);
  const timeframe = VALID_TIMEFRAMES.has(rawTf) ? rawTf : DEFAULT_TIMEFRAME;
  const rawBars = parseInt(params.get("bars") ?? "", 10);
  const bars = Number.isFinite(rawBars) && rawBars > 0 ? Math.min(rawBars, MAX_BARS) : DEFAULT_BARS;
  const rawPriorDays = parseInt(params.get("priorDays") ?? "", 10);
  const priorDays =
    Number.isFinite(rawPriorDays) && rawPriorDays > 0
      ? Math.min(rawPriorDays, MAX_PRIOR_DAYS)
      : 0;

  if (!ticker) {
    return NextResponse.json({ error: "ticker query parameter 가 필요합니다." }, { status: 400 });
  }

  if (!isKisConfigured()) {
    return jsonOk(getMockStockMinuteChart(ticker, timeframe, bars, priorDays), "mock");
  }

  try {
    if (priorDays > 0) {
      // 멀티데이 — 과거 priorDays 세션 + 당일 합산·리샘플, 오름차순.
      const { result: candles, servedSource } = await trackMarketDataSource(() =>
        withTimeout(
          fetchMinuteHistory(ticker, { timeframe, priorDays, includeToday: true }),
          BFF_TIMEOUT_MS_MULTI,
        ),
      );
      return jsonOk(candles, servedSource ?? "kis", { "X-KIS-Env": resolveKisEnv() });
    }

    // 당일 — 1분봉 페이징 → 리샘플 → 최신 bars개만.
    const { result: all, servedSource } = await trackMarketDataSource(() =>
      withTimeout(
        fetchTodayMinuteCandles(ticker, timeframe, bars * timeframe + timeframe),
        BFF_TIMEOUT_MS,
      ),
    );
    const candles = all.slice(-bars);
    return jsonOk(candles, servedSource ?? "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    return mapErrorToResponse(error, ticker, timeframe, bars, priorDays);
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
  priorDays: number,
): NextResponse {
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    return jsonOk(getMockStockMinuteChart(ticker, timeframe, bars, priorDays), "mock-timeout", {
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
