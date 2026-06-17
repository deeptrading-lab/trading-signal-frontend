/**
 * AI 분석 토큰 사용량 집계 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.stock.agentUsage` (종목 무관 단일 키).
 * - staleTime / gcTime = `queryConfig.stock.agentUsage` (60s / 5min).
 * - 수동 새로고침 + 짧은 stale (폴링 없음). 분석 1회 후 재진입 시 갱신.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAgentUsageSummary } from "@/lib/api/stock/agentUsage";
import type { AgentUsageSummary } from "@/lib/types/stock/agentUsage";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryAgentUsage(): UseQueryResult<AgentUsageSummary, ApiError> {
  return useQuery<AgentUsageSummary, ApiError>({
    queryKey: queryKeys.stock.agentUsage,
    queryFn: () => fetchAgentUsageSummary(),
    staleTime: queryConfig.stock.agentUsage.staleTime,
    gcTime: queryConfig.stock.agentUsage.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
