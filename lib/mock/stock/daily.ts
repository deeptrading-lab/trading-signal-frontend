/**
 * mock 일자별 시세 fixture.
 *
 * PRD `stock-api-integration` §6.4 — KIS 환경변수 미설정 시 BFF route 가 본 fixture 를 반환.
 *
 * 모든 ticker 에 동일한 7일 더미 시계열을 돌려준다 (대표 가격대를 ticker 길이로 변형).
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";

const BASE_DATES = [
  "2026-05-21",
  "2026-05-22",
  "2026-05-23",
  "2026-05-24",
  "2026-05-25",
  "2026-05-26",
  "2026-05-27",
];

const BASE_PATTERN = [
  { open: 70_500, high: 71_300, low: 70_200, close: 71_000, volume: 11_000_000 },
  { open: 71_000, high: 71_800, low: 70_900, close: 71_500, volume: 10_500_000 },
  { open: 71_500, high: 71_900, low: 71_000, close: 71_200, volume: 9_800_000 },
  { open: 71_200, high: 71_500, low: 70_400, close: 70_700, volume: 12_300_000 },
  { open: 70_700, high: 71_400, low: 70_500, close: 71_300, volume: 10_900_000 },
  { open: 71_300, high: 71_600, low: 70_800, close: 71_000, volume: 9_600_000 },
  { open: 71_000, high: 71_700, low: 70_900, close: 71_500, volume: 11_200_000 },
];

export function getMockStockDaily(ticker: string): StockDailyCandle[] {
  // ticker 의 마지막 자리 수로 가격대 살짝 변형 (시각 다양성).
  const offset = (Number.parseInt(ticker.slice(-1), 10) || 0) * 100;
  return BASE_DATES.map((date, index) => {
    const pattern = BASE_PATTERN[index];
    return {
      date,
      open: pattern.open + offset,
      high: pattern.high + offset,
      low: pattern.low + offset,
      close: pattern.close + offset,
      volume: pattern.volume,
    };
  });
}
