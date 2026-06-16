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
}, ApiError> {
  return useQuery({
    queryKey: queryKeys.stock.aiDecision(ticker),
    queryFn: ({ signal }) => fetchAIAnalysisDecision(ticker, signal),
    enabled: enabled && ticker.trim().length > 0,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
