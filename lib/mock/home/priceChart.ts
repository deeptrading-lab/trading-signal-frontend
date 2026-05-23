/**
 * Home 가격 추이 차트 14일 시계열 mock.
 *
 * 시안 `AssetChart.tsx` 의 `data` 배열 그대로 — BTC/KRW 10-01 ~ 10-14, 14 포인트.
 * PR6 에서 recharts `AreaChart` 에 주입.
 */

import type { PriceSeries } from "@/lib/types/home/priceChart";

export const PRICE_SERIES_MOCK: PriceSeries = [
  { date: "10-01", price: 82_000_000 },
  { date: "10-02", price: 82_500_000 },
  { date: "10-03", price: 81_000_000 },
  { date: "10-04", price: 83_000_000 },
  { date: "10-05", price: 84_500_000 },
  { date: "10-06", price: 84_000_000 },
  { date: "10-07", price: 85_200_000 },
  { date: "10-08", price: 84_800_000 },
  { date: "10-09", price: 86_000_000 },
  { date: "10-10", price: 85_500_000 },
  { date: "10-11", price: 87_000_000 },
  { date: "10-12", price: 88_500_000 },
  { date: "10-13", price: 87_800_000 },
  { date: "10-14", price: 89_240_000 },
];
