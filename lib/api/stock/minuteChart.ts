/**
 * `/api/stock/chart-minute` 클라이언트 어댑터 — 당일 분봉(단타워치 차트 탭).
 *
 * KIS/토스 직접 호출 금지(BFF 원칙). `hooks/stock/useQueryMinuteChart` 안에서만 호출한다.
 */

import { httpClient } from "@/lib/api/client";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

export async function getStockMinuteChart(
  ticker: string,
  timeframe: number,
  bars: number,
): Promise<StockMinuteCandle[]> {
  const response = await httpClient.get<StockMinuteCandle[]>("/stock/chart-minute", {
    params: { ticker, timeframe, bars },
  });
  return response.data;
}
