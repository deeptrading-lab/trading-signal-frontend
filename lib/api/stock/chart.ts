/**
 * `/api/stock/chart` 클라이언트 어댑터 — 기간별 차트 시세 BFF 호출.
 *
 * `inquire-daily-itemchartprice` 기반 100봉 데이터. 보조지표(MACD·RSI) 계산 소스.
 */

import { httpClient } from "@/lib/api/client";
import type { StockDailyCandle } from "@/lib/api/kis/types";

export type ChartPeriod = "D" | "W" | "M";

export async function fetchStockChart(
  ticker: string,
  days = 100,
  period: ChartPeriod = "D",
): Promise<StockDailyCandle[]> {
  const response = await httpClient.get<StockDailyCandle[]>("/stock/chart", {
    params: { ticker, days, period },
  });
  return response.data;
}
