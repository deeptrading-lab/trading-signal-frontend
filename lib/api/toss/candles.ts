/**
 * 토스 캔들(`GET /api/v1/candles`) 어댑터 — 일봉 범위 페치 + 주/월봉 리샘플.
 *
 * PRD `toss-market-data-adapter` §3-3.
 *
 * ## 토스 캔들 규약 (스모크 실측)
 *
 * - interval 은 `1m`/`1d` 뿐 — 주(W)/월(M)봉은 일봉을 리샘플해 만든다(AC-8).
 * - 1콜 최대 200봉, `before`(exclusive) 커서로 과거 방향 페이징. 일봉 깊이는 상장 전체.
 * - `adjusted` 기본 true(수정주가) — KIS `FID_ORG_ADJ_PRC=0` 과 동일 기준이라 미전송.
 * - 반환은 전부 **오름차순**(BFF mock·chart 라우트 계약과 동일. KIS 원 응답과 달리 소비측
 *   정렬이 전제라 어느 쪽이든 안전하지만 계약을 명시 고정한다).
 *
 * 레이트리밋: MARKET_DATA_CHART 5/s — 페이지 간 250ms + `tossGet` 의 429 Retry-After 재시도.
 */

import { tossGet } from "./client";
import { addDaysToDash, isoToKstDate, todayKstDate, ymdToDash } from "./kst";
import type { TossCandle, TossCandlePage } from "./types";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const PAGE_COUNT = 200;
const PAGE_DELAY_MS = 250;
/** 범위 페치 페이지 상한 — chart 라우트 MAX_DAYS(3000일≈2,050봉=11페이지)의 넉넉한 배수. */
const MAX_RANGE_PAGES = 40;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 캔들 1페이지 — `minute.ts`(분봉 어댑터)도 재사용. */
export async function fetchCandlesPage(
  symbol: string,
  interval: "1m" | "1d",
  options?: { before?: string; count?: number },
): Promise<TossCandlePage> {
  const params: Record<string, string | number> = {
    symbol,
    interval,
    count: options?.count ?? PAGE_COUNT,
  };
  if (options?.before) params.before = options.before;
  const page = await tossGet<TossCandlePage>("/api/v1/candles", params);
  return page ?? {};
}

/** 토스 일봉 1건 → `StockDailyCandle`. timestamp 파싱 실패 봉은 null(호출측 filter). */
function mapTossDailyCandle(candle: TossCandle): StockDailyCandle | null {
  const date = isoToKstDate(candle.timestamp);
  if (!date) return null;
  return {
    date,
    open: num(candle.openPrice),
    high: num(candle.highPrice),
    low: num(candle.lowPrice),
    close: num(candle.closePrice),
    volume: num(candle.volume),
  };
}

function dedupeSortDaily(candles: StockDailyCandle[]): StockDailyCandle[] {
  const seen = new Set<string>();
  return candles
    .filter((c) => {
      if (seen.has(c.date)) return false;
      seen.add(c.date);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 일봉 범위 페치 — `[fromDate, toDate]`(YYYYMMDD 또는 YYYY-MM-DD) 오름차순.
 *
 * `before` 초기값 = toDate 다음날 KST 자정 — 미국 일봉(anchor `T13:00+09:00`)도 toDate 봉까지
 * 포함되고 toDate+1 봉은 exclusive 로 제외된다(kst.ts 주석 참조).
 */
export async function fetchDailyRangeToss(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<StockDailyCandle[]> {
  const fromDash = ymdToDash(fromDate);
  const toDash = ymdToDash(toDate);

  const acc: StockDailyCandle[] = [];
  let before: string | undefined = `${addDaysToDash(toDash, 1)}T00:00:00+09:00`;

  for (let page = 0; page < MAX_RANGE_PAGES; page++) {
    const { candles, nextBefore }: TossCandlePage = await fetchCandlesPage(symbol, "1d", { before });
    const mapped = (candles ?? [])
      .map(mapTossDailyCandle)
      .filter((c): c is StockDailyCandle => c !== null);
    if (mapped.length === 0) break;

    acc.push(...mapped);

    const earliest = mapped.reduce((min, c) => (c.date < min ? c.date : min), mapped[0].date);
    if (earliest <= fromDash) break; // 범위 시작 도달
    if (!nextBefore || nextBefore === before) break; // 데이터 끝 or 진전 없음
    before = nextBefore;
    await delay(PAGE_DELAY_MS);
  }

  return dedupeSortDaily(acc).filter((c) => c.date >= fromDash && c.date <= toDash);
}

/** "YYYY-MM-DD" 가 속한 ISO 주의 월요일 날짜 — 주봉 버킷 키. */
function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // 월=0 … 일=6
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/**
 * 일봉 → 주(W)/월(M)봉 리샘플 (오름차순 입력·출력).
 *
 * 집계 규칙(AC-8): open=버킷 첫 봉 시가, high/low=극값, close=마지막 봉 종가, volume=합산.
 * 봉 라벨 `date` = 버킷 **첫 거래일** — KIS 주봉 라벨(주 시작일, E2E 실측) 파리티.
 */
export function resampleDailyCandles(
  daily: StockDailyCandle[],
  period: "W" | "M",
): StockDailyCandle[] {
  const buckets = new Map<string, StockDailyCandle>();
  const order: string[] = [];

  for (const c of daily) {
    const key = period === "W" ? mondayOf(c.date) : c.date.slice(0, 7);
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { ...c }); // 라벨 = 버킷 첫 거래일(date 유지)
      order.push(key);
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      existing.volume += c.volume;
    }
  }

  return order.map((k) => buckets.get(k)!);
}

/** `fetchStockDaily` 와 동일한 기간별 반환 개수(KIS 최근 ~30건 관례). */
const RECENT_UNIT_COUNT = 30;
/** 월봉 30개 ≈ 거래일 630봉 — 200봉/콜 페이지 수. */
const MONTHLY_PAGES = 4;

/**
 * `fetchStockDaily(ticker, D|W|M)` 의 토스 구현 — 최근 ~30단위, 오름차순.
 */
export async function fetchStockDailyToss(
  ticker: string,
  period: "D" | "W" | "M" = "D",
): Promise<StockDailyCandle[]> {
  if (period === "D") {
    const { candles } = await fetchCandlesPage(ticker, "1d", { count: RECENT_UNIT_COUNT });
    return dedupeSortDaily(
      (candles ?? []).map(mapTossDailyCandle).filter((c): c is StockDailyCandle => c !== null),
    );
  }

  // W: 일봉 200개(≈40주) 1콜 / M: 4콜(≈38개월) 페이징 후 리샘플.
  const acc: StockDailyCandle[] = [];
  let before: string | undefined;
  const pages = period === "W" ? 1 : MONTHLY_PAGES;
  for (let page = 0; page < pages; page++) {
    const { candles, nextBefore }: TossCandlePage = await fetchCandlesPage(ticker, "1d", { before });
    const mapped = (candles ?? [])
      .map(mapTossDailyCandle)
      .filter((c): c is StockDailyCandle => c !== null);
    if (mapped.length === 0) break;
    acc.push(...mapped);
    if (!nextBefore || nextBefore === before) break;
    before = nextBefore;
    if (page < pages - 1) await delay(PAGE_DELAY_MS);
  }

  return resampleDailyCandles(dedupeSortDaily(acc), period).slice(-RECENT_UNIT_COUNT);
}

/**
 * `fetchStockDailyChart(ticker, from, to, period)` 의 토스 구현 — 오름차순.
 * (소비측인 chart 라우트·`fetchDailyChunked` 는 자체 정렬/dedup 하므로 순서 계약도 안전.)
 */
export async function fetchStockDailyChartToss(
  ticker: string,
  fromDate: string,
  toDate: string,
  period: "D" | "W" | "M" = "D",
): Promise<StockDailyCandle[]> {
  const daily = await fetchDailyRangeToss(ticker, fromDate, toDate);
  if (period === "D") return daily;
  return resampleDailyCandles(daily, period);
}

/**
 * 현재가 합성용 최근 일봉 컨텍스트 — 최신 봉이 오늘(KST)이면 `today`, 직전 봉 종가가 `prevClose`.
 *
 * `/prices` 가 등락률·거래량을 주지 않으므로(PRD §1) 이 컨텍스트와 합성한다.
 */
export async function fetchRecentDailyContext(symbol: string): Promise<{
  prevClose: number | null;
  today: StockDailyCandle | null;
}> {
  const { candles } = await fetchCandlesPage(symbol, "1d", { count: 3 });
  const mapped = dedupeSortDaily(
    (candles ?? []).map(mapTossDailyCandle).filter((c): c is StockDailyCandle => c !== null),
  );
  if (mapped.length === 0) return { prevClose: null, today: null };

  const latest = mapped[mapped.length - 1];
  const isLatestToday = latest.date === todayKstDate();
  const today = isLatestToday ? latest : null;
  const prev = isLatestToday ? mapped[mapped.length - 2] : latest;
  return { prevClose: prev && prev.close > 0 ? prev.close : null, today };
}
