/**
 * 저장된 AI 분석 결론 목록 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.stock.aiDecisions` (종목 무관 단일 키).
 * - staleTime / gcTime = `queryConfig.stock.aiDecisions` (60s / 5min).
 * - 진행중(인플라이트/재분석중)이면 ~15s, 없어도 ~30s 베이스라인 + 탭 복귀 시 갱신(unified-analysis-jobs) —
 *   다른 곳(prod·봇·다른 탭)에서 새로 시작된 분석도 수동 새로고침 없이 ~30s 안에 카드로 뜬다.
 *   (개인 도구라 가벼운 idle 베이스라인 부하는 수용 — 진행중이면 더 촘촘히.)
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAIDecisionList } from "@/lib/api/stock/aiAnalysisDecisions";
import type { AIDecisionListResponse } from "@/lib/types/stock/aiAnalysisDecisions";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

/** 진행중(인플라이트/재분석중)일 때 촘촘한 폴링 간격(ms). #176 워커 뱃지와 동일 톤. */
const INFLIGHT_POLL_MS = 15_000;
/** 진행중이 없어도 새로 시작된 분석을 잡기 위한 가벼운 베이스라인 폴링(ms). */
const IDLE_POLL_MS = 30_000;

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
    refetchOnWindowFocus: true, // 탭 복귀 시 즉시 갱신(새 분석 빠르게 반영).
    // 진행중이면 ~15s, 없어도 ~30s 베이스라인 — 새로 시작된 분석을 자동으로 카드에 반영.
    refetchInterval: (query) =>
      hasInflight(query.state.data) ? INFLIGHT_POLL_MS : IDLE_POLL_MS,
  });
}
