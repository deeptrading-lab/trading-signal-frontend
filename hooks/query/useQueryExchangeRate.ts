/**
 * 환율 훅 — 미국 종목 헤더 원화 환산(us-stock-support). `/api/market/exchange-rate` BFF 경유.
 *
 * 토스 환율은 validUntil ~5분이라 staleTime 5분. 부가 정보라 실패·null 은 "미표시" 로 수렴
 * (소비 측은 data.rate 만 본다). `enabled` 로 미국 종목일 때만 조회한다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getExchangeRate } from "@/lib/api/market/exchangeRate";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { ExchangeRateResponse } from "@/lib/types/market/exchangeRate";

const FIVE_MIN = 5 * 60_000;

export function useQueryExchangeRate(
  base: string,
  quote: string,
  enabled = true,
): UseQueryResult<ExchangeRateResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.market.exchangeRate(base, quote),
    queryFn: () => getExchangeRate(base, quote),
    staleTime: FIVE_MIN,
    gcTime: 6 * FIVE_MIN,
    enabled: enabled && base.length === 3 && quote.length === 3,
  });
}
