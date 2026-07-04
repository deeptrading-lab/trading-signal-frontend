/**
 * `/api/stock/orderbook` 클라이언트 어댑터 — 호가창(매수/매도 잔량).
 *
 * 토스 직접 호출 금지(BFF 원칙). `hooks/stock/useQueryStockOrderbook` 안에서만 호출한다.
 */

import { httpClient } from "@/lib/api/client";
import type { StockOrderbookResponse } from "@/lib/types/stock/orderbook";

export async function getStockOrderbook(
  ticker: string,
): Promise<StockOrderbookResponse> {
  const response = await httpClient.get<StockOrderbookResponse>(
    "/stock/orderbook",
    { params: { ticker } },
  );
  return response.data;
}
