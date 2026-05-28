/**
 * 시장 지수 조회 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Market 도메인 훅 신설. 화면 전환은 후속 PR.
 *
 * - codes 기본값 = `DEFAULT_INDEX_CODES` (KOSPI 0001 + KOSDAQ 1001).
 * - queryKey = `queryKeys.market.indices(codes)`. codes 정규화 (sort + join) 로 순서 무관 캐시.
 * - staleTime / gcTime = `queryConfig.market.indices` (10s / 5min).
 * - enabled — codes 빈 배열 시 비활성.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  DEFAULT_INDEX_CODES,
  getMarketIndices,
  type MarketIndexQuote,
} from "@/lib/api/market/indices";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export type UseQueryIndicesOptions = {
  enabled?: boolean;
};

export function useQueryIndices(
  codes: readonly string[] = DEFAULT_INDEX_CODES,
  options?: UseQueryIndicesOptions,
): UseQueryResult<MarketIndexQuote[], ApiError> {
  return useQuery<MarketIndexQuote[], ApiError>({
    queryKey: queryKeys.market.indices(codes),
    queryFn: () => getMarketIndices(codes),
    enabled: (options?.enabled ?? true) && codes.length > 0,
    staleTime: queryConfig.market.indices.staleTime,
    gcTime: queryConfig.market.indices.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
