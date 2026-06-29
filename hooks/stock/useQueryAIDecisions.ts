/**
 * 저장된 AI 분석 결론 목록 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.stock.aiDecisions` (종목 무관 단일 키).
 * - staleTime / gcTime = `queryConfig.stock.aiDecisions` (60s / 5min).
 * - 수동 새로고침 + 짧은 stale. **진행중(인플라이트) 항목이 있을 때만** ~15s 폴링(unified-analysis-jobs) —
 *   분석이 끝나면(인플라이트 0) 폴링이 자동으로 꺼져 불필요한 부하가 없다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAIDecisionList } from "@/lib/api/stock/aiAnalysisDecisions";
import type { AIDecisionListResponse } from "@/lib/types/stock/aiAnalysisDecisions";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

/** 인플라이트(진행중/재분석중)가 있을 때 폴링 간격(ms). #176 워커 뱃지와 동일 톤. */
const INFLIGHT_POLL_MS = 15_000;

/** 응답에 진행중 항목(첫 분석 플레이스홀더 or 재분석중 카드)이 있으면 true. */
function hasInflight(data: AIDecisionListResponse | undefined): boolean {
  if (!data) return false;
  return data.inflight.length > 0 || data.items.some((it) => it.reanalysis != null);
}

export function useQueryAIDecisions(): UseQueryResult<AIDecisionListResponse, ApiError> {
  return useQuery<AIDecisionListResponse, ApiError>({
    queryKey: queryKeys.stock.aiDecisions,
    queryFn: () => fetchAIDecisionList(),
    staleTime: queryConfig.stock.aiDecisions.staleTime,
    gcTime: queryConfig.stock.aiDecisions.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
    // 진행중 항목이 있을 때만 폴링, 모두 완료되면 false(폴링 정지).
    refetchInterval: (query) => (hasInflight(query.state.data) ? INFLIGHT_POLL_MS : false),
  });
}
