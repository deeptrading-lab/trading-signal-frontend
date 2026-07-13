/**
 * `/api/market/exchange-rate` 클라이언트 어댑터 — 환율(원화 환산).
 *
 * 토스 직접 호출 금지(BFF 원칙). `hooks/query/useQueryExchangeRate` 안에서만 호출한다.
 */

import { httpClient } from "@/lib/api/client";
import type { ExchangeRateResponse } from "@/lib/types/market/exchangeRate";

export async function getExchangeRate(
  base: string,
  quote: string,
): Promise<ExchangeRateResponse> {
  const response = await httpClient.get<ExchangeRateResponse>(
    "/market/exchange-rate",
    { params: { base, quote } },
  );
  return response.data;
}
