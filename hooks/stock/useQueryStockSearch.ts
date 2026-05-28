/**
 * 종목 검색 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-B) §3.4, §9 q7 [RESOLVED] — 수동 시드 350개 substring 검색.
 *
 * - queryKey = `queryKeys.stock.search(keyword)` (PR-A 정착).
 * - staleTime / gcTime = `queryConfig.stock.search` (5min / 30min).
 * - enabled — 빈 keyword 시 비활성. 사용자 입력 시작 전 호출 0.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchStockSearchClient } from "@/lib/api/stock/search";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { StockSearchResult } from "@/lib/api/kis/types";

export type UseQueryStockSearchOptions = {
  enabled?: boolean;
};

export function useQueryStockSearch(
  keyword: string,
  options?: UseQueryStockSearchOptions,
): UseQueryResult<StockSearchResult[], ApiError> {
  return useQuery<StockSearchResult[], ApiError>({
    queryKey: queryKeys.stock.search(keyword),
    queryFn: () => fetchStockSearchClient(keyword),
    enabled: (options?.enabled ?? true) && keyword.length > 0,
    staleTime: queryConfig.stock.search.staleTime,
    gcTime: queryConfig.stock.search.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
