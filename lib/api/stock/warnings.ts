/**
 * `/api/stock/warnings` 클라이언트 어댑터 — 매수 유의사항(시장경보·VI).
 *
 * 토스 직접 호출 금지(BFF 원칙). `hooks/stock/useQueryStockWarnings` 안에서만 호출한다.
 */

import { httpClient } from "@/lib/api/client";
import type { StockWarningsResponse } from "@/lib/types/stock/warnings";

export async function getStockWarnings(
  ticker: string,
): Promise<StockWarningsResponse> {
  const response = await httpClient.get<StockWarningsResponse>(
    "/stock/warnings",
    { params: { ticker } },
  );
  return response.data;
}
