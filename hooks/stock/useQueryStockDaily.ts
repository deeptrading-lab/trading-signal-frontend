/**
 * 일자별 시세 조회 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-B) §3.4.
 *
 * - queryKey = `queryKeys.stock.daily(ticker, period)` (PR-A 정착).
 * - staleTime / gcTime = `queryConfig.stock.daily` (1d / 7d).
 * - period 기본값 "D" (일봉). W/M 는 후속 PR 의 타임프레임 chip 과 연결.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchStockDailyClient, type StockDailyPeriod } from "@/lib/api/stock/daily";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { StockDailyCandle } from "@/lib/api/kis/types";

export type UseQueryStockDailyOptions = {
  enabled?: boolean;
};

export function useQueryStockDaily(
  ticker: string,
  period: StockDailyPeriod = "D",
  options?: UseQueryStockDailyOptions,
): UseQueryResult<StockDailyCandle[], ApiError> {
  return useQuery<StockDailyCandle[], ApiError>({
    queryKey: queryKeys.stock.daily(ticker, period),
    queryFn: () => fetchStockDailyClient(ticker, period),
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    staleTime: queryConfig.stock.daily.staleTime,
    gcTime: queryConfig.stock.daily.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
