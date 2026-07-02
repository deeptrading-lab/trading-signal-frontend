/**
 * fetchDailyChunked — KIS 일봉 청크 분할 호출 유틸.
 *
 * inquire-daily-itemchartprice 는 1회 호출 시 ~100봉 한도. 200봉 이상 필요한 경우
 * CHUNK_DAYS(130) 단위로 분할 순차 호출 후 중복 제거·오름차순 정렬하여 반환.
 *
 * 사용처: app/api/stock/chart/route.ts
 */

import { fetchStockDailyChartKis } from "@/lib/api/kis/price";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import { withTossFallback } from "@/lib/api/marketdata/source";
import { fetchDailyRangeToss } from "@/lib/api/toss/candles";

/** 단일 호출 커버 가능 캘린더일 (100 영업봉 ≒ 140일, 여유 10일). */
const CHUNK_DAYS = 130;
/** 청크 간 지연 — EGW00201 회피. */
const CHUNK_DELAY_MS = 150;

function toYyyymmdd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 일봉 청크 분할 호출.
 * @param ticker  종목코드 6자리
 * @param fromDate YYYYMMDD
 * @param toDate   YYYYMMDD
 * @returns 중복 제거·오름차순 정렬된 StockDailyCandle[]
 */
export async function fetchDailyChunked(
  ticker: string,
  fromDate: string,
  toDate: string,
): Promise<StockDailyCandle[]> {
  // 토스는 커서 페이징(콜당 200봉)이라 130일 청크 분할이 불필요·유해(3000일=24청크 중복 페치로
  // 12s 라우트 예산 초과). 토글 시 범위 페치 1회로 위임하고, 실패 시에만 KIS 청크 경로.
  // 폴백 본문은 wrapper(fetchStockDailyChart)가 아닌 *Kis 를 직접 써서 청크당 토스 재시도를 차단.
  return withTossFallback(
    "일봉 범위(청크)",
    () => fetchDailyRangeToss(ticker, fromDate, toDate),
    () => fetchDailyChunkedKis(ticker, fromDate, toDate),
  );
}

async function fetchDailyChunkedKis(
  ticker: string,
  fromDate: string,
  toDate: string,
): Promise<StockDailyCandle[]> {
  const from = new Date(`${fromDate.slice(0, 4)}-${fromDate.slice(4, 6)}-${fromDate.slice(6, 8)}`);
  const to = new Date(`${toDate.slice(0, 4)}-${toDate.slice(4, 6)}-${toDate.slice(6, 8)}`);

  const chunks: Array<{ from: string; to: string }> = [];
  let chunkTo = new Date(to);
  while (chunkTo >= from) {
    const chunkFrom = addDays(chunkTo, -CHUNK_DAYS + 1);
    const effectiveFrom = chunkFrom < from ? from : chunkFrom;
    chunks.push({ from: toYyyymmdd(effectiveFrom), to: toYyyymmdd(chunkTo) });
    chunkTo = addDays(effectiveFrom, -1);
  }

  const all: StockDailyCandle[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const { from: cf, to: ct } = chunks[i];
    const candles = await fetchStockDailyChartKis(ticker, cf, ct, "D");
    all.push(...candles);
    if (i < chunks.length - 1) await delay(CHUNK_DELAY_MS);
  }

  const seen = new Set<string>();
  return all
    .filter((c) => {
      if (seen.has(c.date)) return false;
      seen.add(c.date);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export { CHUNK_DAYS, toYyyymmdd, addDays };
