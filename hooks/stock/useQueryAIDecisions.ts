/**
 * 저장된 AI 분석 결론 목록 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.stock.aiDecisions` (종목 무관 단일 키).
 * - staleTime / gcTime = `queryConfig.stock.aiDecisions` (60s / 5min).
 * - 수동 새로고침 + 짧은 stale (폴링 없음). 분석 1회 후 재진입 시 갱신.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAIDecisionList } from "@/lib/api/stock/aiAnalysisDecisions";
import type { AIDecisionListResponse } from "@/lib/types/stock/aiAnalysisDecisions";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryAIDecisions(): UseQueryResult<AIDecisionListResponse, ApiError> {
  return useQuery<AIDecisionListResponse, ApiError>({
    queryKey: queryKeys.stock.aiDecisions,
    queryFn: () => fetchAIDecisionList(),
    staleTime: queryConfig.stock.aiDecisions.staleTime,
    gcTime: queryConfig.stock.aiDecisions.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
