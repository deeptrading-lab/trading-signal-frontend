/**
 * `/api/stock/trades` 클라이언트 어댑터 — 최근 체결(체결강도 + 체결 테이프).
 *
 * 토스 직접 호출 금지(BFF 원칙). `hooks/stock/useQueryStockTrades` 안에서만 호출한다.
 */

import { httpClient } from "@/lib/api/client";
import type { TradesResult } from "@/lib/types/stock/trades";

export async function getStockTrades(
  ticker: string,
  count?: number,
): Promise<TradesResult> {
  const response = await httpClient.get<TradesResult>("/stock/trades", {
    params: count != null ? { ticker, count } : { ticker },
  });
  return response.data;
}
