/**
 * 거래량/거래대금 순위 mock — KIS 미설정/비-prod/타임아웃 시 BFF fallback (레이아웃·로컬 demo 용).
 *
 * `by="value"` 면 거래대금(tradingValue) 내림차순으로 정렬해 거래량순과 시각적으로 구분되게 한다.
 */

import type {
  VolumeRankBy,
  VolumeRankResponse,
  VolumeRankRow,
} from "@/lib/types/market/volumeRank";

const MOCK_ROWS: VolumeRankRow[] = [
  { ticker: "005930", name: "삼성전자", price: 290500, changePercent: 1.2, direction: "up", volume: 18_234_567, tradingValue: 5_297_141_000_000, marketCap: 173_400_000_000_000, sector: "전기·전자" },
  { ticker: "000660", name: "SK하이닉스", price: 412000, changePercent: 2.8, direction: "up", volume: 9_120_345, tradingValue: 3_757_582_000_000, marketCap: 299_900_000_000_000, sector: "전기·전자" },
  { ticker: "042660", name: "한화오션", price: 98200, changePercent: -1.4, direction: "down", volume: 7_882_110, tradingValue: 774_023_000_000, marketCap: 30_100_000_000_000, sector: "운수장비" },
  { ticker: "373220", name: "LG에너지솔루션", price: 388500, changePercent: 0.6, direction: "up", volume: 5_431_002, tradingValue: 2_109_944_000_000, marketCap: 90_900_000_000_000, sector: "전기·전자" },
  { ticker: "035720", name: "카카오", price: 61200, changePercent: -0.8, direction: "down", volume: 4_990_871, tradingValue: 305_441_000_000, marketCap: 27_200_000_000_000, sector: "서비스업" },
  { ticker: "005380", name: "현대차", price: 268000, changePercent: 0.0, direction: "flat", volume: 3_120_449, tradingValue: 836_280_000_000, marketCap: 56_100_000_000_000, sector: "운수장비" },
];

export function getMockVolumeRank(by: VolumeRankBy = "volume"): VolumeRankResponse {
  const rows =
    by === "value"
      ? [...MOCK_ROWS].sort(
          (a, b) => (b.tradingValue ?? 0) - (a.tradingValue ?? 0),
        )
      : MOCK_ROWS;
  return {
    rows,
    asOf: new Date().toISOString(),
  };
}
