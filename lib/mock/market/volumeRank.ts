/**
 * 거래량 순위 mock — KIS 미설정/비-prod/타임아웃 시 BFF fallback (레이아웃·로컬 demo 용).
 */

import type { VolumeRankResponse } from "@/lib/types/market/volumeRank";

export function getMockVolumeRank(): VolumeRankResponse {
  return {
    rows: [
      { ticker: "005930", name: "삼성전자", price: 290500, changePercent: 1.2, direction: "up", volume: 18_234_567 },
      { ticker: "000660", name: "SK하이닉스", price: 412000, changePercent: 2.8, direction: "up", volume: 9_120_345 },
      { ticker: "042660", name: "한화오션", price: 98200, changePercent: -1.4, direction: "down", volume: 7_882_110 },
      { ticker: "373220", name: "LG에너지솔루션", price: 388500, changePercent: 0.6, direction: "up", volume: 5_431_002 },
      { ticker: "035720", name: "카카오", price: 61200, changePercent: -0.8, direction: "down", volume: 4_990_871 },
      { ticker: "005380", name: "현대차", price: 268000, changePercent: 0.0, direction: "flat", volume: 3_120_449 },
    ],
    asOf: new Date().toISOString(),
  };
}
