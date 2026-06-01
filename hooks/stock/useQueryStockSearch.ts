/**
 * 종목 검색 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-B) §3.4 / api-optimization-roadmap P1.
 *
 * - queryKey = `queryKeys.stock.search(keyword)` (PR-A 정착).
 * - staleTime / gcTime = `queryConfig.stock.search` (5min / 30min).
 * - enabled — 빈 keyword 시 비활성. 사용자 입력 시작 전 호출 0.
 *
 * 클라이언트 사이드 검색 (P1): 검색 대상은 in-repo `symbols.json`(완전 정적 시드)이라 BFF 왕복이
 * 불필요하다. queryFn 에서 `searchSymbols` 를 **동적 import** 해 클라이언트에서 직접 검색한다.
 *   - BFF(`/api/stock/search`) 왕복 제거 → 키워드 입력마다 네트워크 0, 즉시 결과.
 *   - 시드(323K)는 첫 검색 시 동적 import 로 **lazy 로드** → 홈(`/`) 초기 번들 미포함.
 *   - 동일 모듈을 정적 import 하는 경로(`/watchlist` 의 `getSymbolName`)는 기존대로 동작.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
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
    queryFn: async () => {
      const { searchSymbols } = await import("@/lib/api/kis/search");
      return searchSymbols(keyword);
    },
    enabled: (options?.enabled ?? true) && keyword.length > 0,
    staleTime: queryConfig.stock.search.staleTime,
    gcTime: queryConfig.stock.search.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
