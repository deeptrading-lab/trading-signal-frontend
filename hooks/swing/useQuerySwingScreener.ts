/**
 * 스윙 체크 스크리너 목록 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.swing.screener(filter, market)`.
 * - staleTime / gcTime = `queryConfig.swing.screener` — 크론이 하루 1회(07:20 KST) 갱신.
 */

"use client";

import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSwingScreener } from "@/lib/api/swing/screener";
import type { SwingMarket } from "@/lib/swing/rulebook";
import type { SwingScreenerFilter, SwingScreenerResponse, SwingScreenerSort } from "@/lib/types/swing/api";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQuerySwingScreener(
  filter: SwingScreenerFilter,
  market: SwingMarket | null,
  sort: SwingScreenerSort = "adv",
): UseQueryResult<SwingScreenerResponse, ApiError> {
  return useQuery<SwingScreenerResponse, ApiError>({
    queryKey: queryKeys.swing.screener(filter, market, sort),
    queryFn: () => fetchSwingScreener(filter, market, sort),
    staleTime: queryConfig.swing.screener.staleTime,
    gcTime: queryConfig.swing.screener.gcTime,
    // 탭·시장 전환 때 목록이 비었다가 다시 채워지는 깜빡임 방지.
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
