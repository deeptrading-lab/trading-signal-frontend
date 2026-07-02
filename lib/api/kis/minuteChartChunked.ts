/**
 * 분봉 청크/리샘플 유틸 — KIS 1분봉을 역방향 페이징해 모으고 N분봉으로 리샘플한다.
 *
 * KIS 분봉 엔드포인트(`inquire-time-itemchartprice`/`inquire-time-dailychartprice`)는
 * **1분봉 네이티브**이며 1회 ~30봉 한도다. 한 세션(09:00~15:30=390분)·여러 날을 덮으려면
 * 기준시각(`FID_INPUT_HOUR_1`)을 가장 이른 봉 직전으로 내려 반복 호출한다(150ms 지연, EGW00201 회피).
 *
 * 3/5/15분봉은 1분봉을 `resampleMinuteCandles` 로 버킷 집계해 만든다.
 *
 * 사용처: 검증 게이트 백테스트, 라이브 단타 루프 warmup/당일 페치.
 * ⚠️ `fetchMinuteHistory` 는 호출량이 크다(하루 ~13콜). 라이브 루프는 전일 warmup 을 1회 캐시하고
 *    틱마다는 당일분만 갱신하도록 상위 레이어가 최적화한다.
 */

import { fetchStockMinuteChart, fetchStockMinuteDaily } from "./price";
import type { StockMinuteCandle } from "./types";
import {
  dedupeSortMinuteCandles,
  dropFillerBars,
  minutesOfDay,
  resampleMinuteCandles,
} from "./minuteResample";
import { isTransientError } from "@/lib/server/bffUtils";
import { isApiError } from "@/lib/api/errors";
import { withTossFallback } from "@/lib/api/marketdata/source";
import {
  fetchMinuteCandlesForDateToss,
  fetchMinuteHistoryToss,
  fetchTodayMinuteCandlesToss,
} from "@/lib/api/toss/minute";

// 리샘플/정리 순수 함수는 `minuteResample.ts` 로 추출(토스 어댑터와 공유 — 순환 import 방지).
// 기존 import 경로 호환을 위해 re-export 유지.
export { resampleMinuteCandles, dropFillerBars } from "./minuteResample";

/** 1분봉 1콜 ~30봉, 하루 390분 → ~13페이지. 여유 포함 상한. */
const MAX_PAGES_PER_DAY = 16;
/** 페이지 간 지연 — EGW00201(과도호출) 회피. */
const PAGE_DELAY_MS = 150;
/** transient 재시도 backoff(선형 증가). 백테스트가 수백 콜 쏘므로 페이지마다 재시도. */
const RETRY_BACKOFF_MS = 400;
/** 페이지 1콜 최대 재시도 횟수 — KIS 분봉 차트는 간헐 5xx 가 잦다(일봉 백테스트 교훈 동일). */
const MAX_PAGE_RETRIES = 3;
/** priorDays 채우려고 거슬러 볼 최대 캘린더일(주말·휴장 흡수). */
const MAX_CALENDAR_LOOKBACK = 20;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** EGW00201/네트워크(공통 isTransientError) + KIS 간헐 5xx 를 재시도 대상으로 본다. */
function isRetryablePageError(error: unknown): boolean {
  if (isTransientError(error)) return true;
  return isApiError(error) && typeof error.status === "number" && error.status >= 500;
}

/** 분봉 페이지 1콜 — transient 시 backoff 후 최대 MAX_PAGE_RETRIES 회 재시도, 그래도 실패면 throw. */
async function withPageRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= MAX_PAGE_RETRIES - 1 || !isRetryablePageError(error)) throw error;
      await delay(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }
}

/**
 * 가장 이른 봉의 직전 분 기준시각 HHMMSS("HHmm00"). 09:00 이전이면 null(페이징 종료).
 */
function prevAnchorHhmmss(earliestStamp: string): string | null {
  const total = minutesOfDay(earliestStamp) - 1;
  if (total < 9 * 60) return null;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}${mm}00`;
}

function nDaysAgoYyyymmdd(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${m}${day}`;
}

/**
 * 한 세션(당일 또는 과거 1일)을 역방향 페이징해 1분봉 전부를 모은다.
 * @param fetchAt 기준시각(HHMMSS, ""=최신)으로 ~30봉을 돌려주는 페이저.
 */
async function pageDayBackward(
  fetchAt: (anchorHhmmss: string) => Promise<StockMinuteCandle[]>,
): Promise<StockMinuteCandle[]> {
  const acc: StockMinuteCandle[] = [];
  let anchor = "";
  let prevEarliest = "";

  for (let page = 0; page < MAX_PAGES_PER_DAY; page++) {
    const batch = await withPageRetry(() => fetchAt(anchor));
    if (batch.length === 0) break;
    acc.push(...batch);

    const earliest = batch.reduce((min, c) => (c.date < min ? c.date : min), batch[0].date);
    if (earliest === prevEarliest) break; // 진전 없음 → 종료
    prevEarliest = earliest;

    const next = prevAnchorHhmmss(earliest);
    if (!next) break;
    anchor = next;
    await delay(PAGE_DELAY_MS);
  }

  return dedupeSortMinuteCandles(acc);
}

/**
 * 당일 분봉(라이브) — `inquire-time-itemchartprice` 역방향 페이징 후 리샘플.
 * @param maxBars 모을 1분봉 상한(페이징 캡, 기본=한 세션 전부).
 */
export async function fetchTodayMinuteCandles(
  ticker: string,
  timeframe: number,
  maxBars: number = 400,
): Promise<StockMinuteCandle[]> {
  return withTossFallback(
    "당일 분봉",
    () => fetchTodayMinuteCandlesToss(ticker, timeframe, maxBars),
    () => fetchTodayMinuteCandlesKis(ticker, timeframe, maxBars),
  );
}

async function fetchTodayMinuteCandlesKis(
  ticker: string,
  timeframe: number,
  maxBars: number = 400,
): Promise<StockMinuteCandle[]> {
  const acc: StockMinuteCandle[] = [];
  let anchor = "";
  let prevEarliest = "";

  for (let page = 0; page < MAX_PAGES_PER_DAY && acc.length < maxBars; page++) {
    const batch = await withPageRetry(() => fetchStockMinuteChart(ticker, anchor, true));
    if (batch.length === 0) break;
    acc.push(...batch);
    const earliest = batch.reduce((min, c) => (c.date < min ? c.date : min), batch[0].date);
    if (earliest === prevEarliest) break;
    prevEarliest = earliest;
    const next = prevAnchorHhmmss(earliest);
    if (!next) break;
    anchor = next;
    await delay(PAGE_DELAY_MS);
  }

  return resampleMinuteCandles(dropFillerBars(dedupeSortMinuteCandles(acc)), timeframe);
}

/**
 * 과거 특정 일자의 분봉 — `inquire-time-dailychartprice` 페이징 후 리샘플.
 */
export async function fetchMinuteCandlesForDate(
  ticker: string,
  dateYyyymmdd: string,
  timeframe: number,
): Promise<StockMinuteCandle[]> {
  return withTossFallback(
    "과거일 분봉",
    () => fetchMinuteCandlesForDateToss(ticker, dateYyyymmdd, timeframe),
    () => fetchMinuteCandlesForDateKis(ticker, dateYyyymmdd, timeframe),
  );
}

async function fetchMinuteCandlesForDateKis(
  ticker: string,
  dateYyyymmdd: string,
  timeframe: number,
): Promise<StockMinuteCandle[]> {
  const oneMin = await pageDayBackward((anchor) =>
    fetchStockMinuteDaily(ticker, dateYyyymmdd, anchor),
  );
  return resampleMinuteCandles(dropFillerBars(oneMin), timeframe);
}

/**
 * 분봉 히스토리 — 과거 `priorDays` 세션 + (옵션) 당일, 합산·리샘플·오름차순.
 *
 * warmup(전일 분봉 이어붙이기)·백테스트의 주 진입점. 휴장일은 KIS 가 빈 응답 →
 * 자동 skip 하며 `priorDays` 만큼의 **거래일**을 채운다(최대 `MAX_CALENDAR_LOOKBACK` 거슬러).
 * ⚠️ 호출량이 큼(거래일당 ~13콜). 라이브 루프는 상위에서 캐시할 것.
 *
 * @param priorDays 당일 외에 거슬러 모을 거래일 수(warmup용, 기본 1).
 * @param includeToday 당일분봉 포함 여부(기본 true).
 */
export async function fetchMinuteHistory(
  ticker: string,
  opts: { timeframe: number; priorDays?: number; includeToday?: boolean },
): Promise<StockMinuteCandle[]> {
  return withTossFallback(
    "분봉 히스토리",
    () => fetchMinuteHistoryToss(ticker, opts),
    () => fetchMinuteHistoryKis(ticker, opts),
  );
}

async function fetchMinuteHistoryKis(
  ticker: string,
  opts: { timeframe: number; priorDays?: number; includeToday?: boolean },
): Promise<StockMinuteCandle[]> {
  const { timeframe, priorDays = 1, includeToday = true } = opts;
  const oneMin: StockMinuteCandle[] = [];

  if (includeToday) {
    const today = await pageDayBackward((anchor) => fetchStockMinuteChart(ticker, anchor, true));
    oneMin.push(...today);
  }

  let filled = 0;
  for (let back = 1; back <= MAX_CALENDAR_LOOKBACK && filled < priorDays; back++) {
    const date = nDaysAgoYyyymmdd(back);
    const day = await pageDayBackward((anchor) => fetchStockMinuteDaily(ticker, date, anchor));
    if (day.length > 0) {
      oneMin.push(...day);
      filled += 1;
    }
  }

  return resampleMinuteCandles(dropFillerBars(dedupeSortMinuteCandles(oneMin)), timeframe);
}
