/**
 * fetchIndexDailyChunked — KIS 지수 일봉 청크 분할 호출 유틸.
 *
 * PRD `scorecard-relative-scoring`. `inquire-daily-indexchartprice` 는 1회 ~100봉 한도.
 * 베타 추정 윈도우(entry 직전 60영업일) + horizon 구간(최대 21영업일 + 여유)을 한 번에 덮으려면
 * 100봉을 넘을 수 있어, 종목 일봉 청크(`fetchDailyChunked`)와 동일한 CHUNK_DAYS 분할 패턴으로
 * 여러 번 호출 후 중복 제거·오름차순 정렬한다.
 *
 * 사용처: lib/server/scorecard/relativeRunScoring.ts(지수 history 취득).
 */

import { fetchIndexDailyChart } from "@/lib/api/kis/index-chart";
import type { IndexDailyClose } from "@/lib/api/kis/types";

/** 단일 호출 커버 가능 캘린더일 (100 영업봉 ≒ 140일, 여유 10일). 종목 청크와 동일. */
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
 * 지수 일봉 청크 분할 호출.
 * @param code 업종 코드("0001" KOSPI / "1001" KOSDAQ).
 * @param fromDate YYYYMMDD
 * @param toDate   YYYYMMDD
 * @returns 중복 제거·오름차순 정렬된 `IndexDailyClose[]`.
 */
export async function fetchIndexDailyChunked(
  code: string,
  fromDate: string,
  toDate: string,
): Promise<IndexDailyClose[]> {
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

  const all: IndexDailyClose[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const { from: cf, to: ct } = chunks[i];
    const candles = await fetchIndexDailyChart(code, cf, ct);
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

export { CHUNK_DAYS };
