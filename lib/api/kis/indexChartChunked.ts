/**
 * fetchIndexDailyChunked — KIS 지수 일봉 청크 분할 호출 유틸.
 *
 * PRD `scorecard-relative-scoring`. `inquire-daily-indexchartprice` 는 실측 1회 **최대 50봉** 한도
 * (범위를 넓게 줘도 최근 50봉만 반환하고 과거는 조용히 버림).
 * 베타 추정 윈도우(entry 직전 60영업일) + horizon 구간(최대 21영업일 + 여유)을 한 번에 덮으려면
 * 50봉을 넘으므로, CHUNK_DAYS(50봉 안에 드는 캘린더일) 분할 패턴으로 여러 번 호출 후
 * 중복 제거·오름차순 정렬한다.
 *
 * 사용처: lib/server/scorecard/relativeRunScoring.ts(지수 history 취득).
 */

import { fetchIndexDailyChart } from "@/lib/api/kis/index-chart";
import type { IndexDailyClose } from "@/lib/api/kis/types";

/**
 * 단일 호출 커버 캘린더일. `inquire-daily-indexchartprice`(FHKUP03500100)는 실측 1콜 **최대 50봉**만
 * 반환하고(범위가 더 넓어도 최근 50봉만 주고 과거는 조용히 버림) 60 캘린더일 ≒ 40~43 영업봉이라
 * 50봉 한도 안에 들어와 봉 누락이 없다. (종목 일봉 청크는 100봉 한도라 130일을 쓰지만 지수는 별개.)
 */
const CHUNK_DAYS = 60;
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
