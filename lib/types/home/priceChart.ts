/**
 * Home 가격 추이 차트 시계열.
 *
 * 시안 `AssetChart.tsx` 의 `data: { date, price }[]` 정합. PR6 에서
 * recharts 의 `AreaChart` 에 그대로 주입.
 */

export type PricePoint = {
  /** 시점 라벨 (MM-DD 또는 YYYY-MM-DD). */
  date: string;
  /** 종가 (KRW). */
  price: number;
};

export type PriceSeries = PricePoint[];
