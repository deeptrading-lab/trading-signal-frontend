/**
 * 종목 검색 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-B) §3.4 / api-optimization-roadmap P1.
 *
 * - queryKey = `queryKeys.stock.search(keyword)` (PR-A 정착).
 * - staleTime / gcTime = `queryConfig.stock.search` (5min / 30min).
 * - enabled — 빈 keyword 시 비활성. 사용자 입력 시작 전 호출 0.
 *
 * BFF 검색 (mobile-perf-bundle): 검색 시드가 미국 편입 후 2MB(국내 329KB + 미국 1.7MB)로
 * 커져, 클라이언트 lazy import 방식은 첫 검색 시 모바일에서 다운로드+파싱+힙 상주 비용이
 * 탭 킬(메모리)에 기여했다. 검색을 BFF(`/api/stock/search`)로 이전 — 클라는 얇은 fetcher 만
 * 소비하고 시드는 서버 전용. 입력은 소비처에서 디바운스되고 staleTime 5min 캐시가 동일
 * 키워드 재왕복을 막아 네트워크 왕복 비용은 체감 미미.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchStockSearch } from "@/lib/api/stock/search";
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
    queryFn: () => fetchStockSearch(keyword),
    enabled: (options?.enabled ?? true) && keyword.length > 0,
    staleTime: queryConfig.stock.search.staleTime,
    gcTime: queryConfig.stock.search.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
