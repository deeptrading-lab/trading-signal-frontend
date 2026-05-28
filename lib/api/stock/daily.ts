/**
 * `/api/stock/daily` 클라이언트 — 일자별 시세 BFF 호출.
 *
 * PRD `stock-api-integration` (PR-B) §3.3.1.
 *
 * period 기본값 "D" (일봉). BFF route handler 가 W/M 일 경우 W/M 으로 위임, 그 외는 "D".
 */

import { httpClient } from "@/lib/api/client";
import type { StockDailyCandle } from "@/lib/api/kis/types";

export type StockDailyPeriod = "D" | "W" | "M";

export async function fetchStockDailyClient(
  ticker: string,
  period: StockDailyPeriod = "D",
): Promise<StockDailyCandle[]> {
  const response = await httpClient.get<StockDailyCandle[]>("/stock/daily", {
    params: { ticker, period },
  });
  return response.data;
}
