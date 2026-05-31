/**
 * 최근 공시 N건 조회 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-B) §3.4.
 *
 * - queryKey = `queryKeys.disclosure.list(ticker, count)` (PR-A 정착).
 * - staleTime / gcTime = `queryConfig.disclosure.list` (5min / 30min). 신규 공시 빠른 반영.
 * - count 기본값 5 (Profile 화면 정합).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchDisclosureListClient } from "@/lib/api/disclosure/list";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { DisclosureItem } from "@/lib/api/dart/types";

export type UseQueryDisclosureListOptions = {
  enabled?: boolean;
};

export function useQueryDisclosureList(
  ticker: string,
  count: number = 5,
  options?: UseQueryDisclosureListOptions,
): UseQueryResult<DisclosureItem[], ApiError> {
  return useQuery<DisclosureItem[], ApiError>({
    queryKey: queryKeys.disclosure.list(ticker, count),
    queryFn: () => fetchDisclosureListClient(ticker, count),
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    staleTime: queryConfig.disclosure.list.staleTime,
    gcTime: queryConfig.disclosure.list.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
