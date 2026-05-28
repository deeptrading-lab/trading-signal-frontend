/**
 * 현재가 조회 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-B) §3.4.
 *
 * - queryKey = `queryKeys.stock.price(ticker)` (PR-A 정착).
 * - staleTime / gcTime = `queryConfig.stock.price` (PR-A 정착, §6.1).
 * - retry 1 — 일시 네트워크 실패 대응.
 * - refetchOnWindowFocus false — 폴링·focus 마다 KIS 호출 폭주 회피. 명시적 invalidate 로 갱신.
 * - enabled — ticker 빈 문자열 시 비활성. 컴포넌트가 ticker 결정 전 mount 되어도 호출 0.
 *
 * 응답 가공 (`select` 불필요) — BFF route 가 이미 `StockPrice` 클라이언트 친화 스키마 반환.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchStockPriceClient } from "@/lib/api/stock/price";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { StockPrice } from "@/lib/api/kis/types";

export type UseQueryStockPriceOptions = {
  /** false 면 쿼리 비활성 (ticker 미정 단계). 기본 true. */
  enabled?: boolean;
};

export function useQueryStockPrice(
  ticker: string,
  options?: UseQueryStockPriceOptions,
): UseQueryResult<StockPrice, ApiError> {
  return useQuery<StockPrice, ApiError>({
    queryKey: queryKeys.stock.price(ticker),
    queryFn: () => fetchStockPriceClient(ticker),
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    staleTime: queryConfig.stock.price.staleTime,
    gcTime: queryConfig.stock.price.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
