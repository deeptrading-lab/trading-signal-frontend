/**
 * 저장된 종목별 최신 AI 분석 결론 조회 훅.
 *
 * 브라우저는 Supabase를 직접 호출하지 않고 BFF(`/api/stock/ai-analysis/decision`)만 호출한다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAIAnalysisDecision } from "@/lib/api/stock/aiAnalysis";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { AIAnalysisDecisionSnapshot } from "@/lib/types/stock/aiAnalysis";

export function useQueryAIDecision(
  ticker: string,
  enabled = true,
): UseQueryResult<{
  configured: boolean;
  decision: AIAnalysisDecisionSnapshot | null;
  active: { status: "pending" | "processing" } | null;
}, ApiError> {
  return useQuery({
    queryKey: queryKeys.stock.aiDecision(ticker),
    queryFn: ({ signal }) => fetchAIAnalysisDecision(ticker, signal),
    enabled: enabled && ticker.trim().length > 0,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
    // 이 종목이 진행 중(active)이면 ~12s 폴링 → 완료 시 같은 응답으로 결과(decision)+active 종료를
    // 함께 반영해 "분석 중"이 자동으로 결과 카드로 전환된다. active 없으면 폴링 안 함(정지).
    refetchInterval: (query) => (query.state.data?.active ? 12_000 : false),
  });
}
