/**
 * 저장된 종목별 최신 AI 분석 결론 조회 훅.
 *
 * 브라우저는 Supabase를 직접 호출하지 않고 BFF(`/api/stock/ai-analysis/decision`)만 호출한다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAIAnalysisDecision } from "@/lib/api/stock/aiAnalysis";
import { queryKeys } from "@/hooks/query/queryKeys";
import { stripDecisionTickers } from "@/lib/stock/stripDecisionTickers";
import type { ApiError } from "@/lib/api/errors";
import type { AIAnalysisDecisionSnapshot } from "@/lib/types/stock/aiAnalysis";

interface AIDecisionResponse {
  configured: boolean;
  decision: AIAnalysisDecisionSnapshot | null;
  active: { status: "pending" | "processing" } | null;
}

/**
 * 저장 스냅샷의 최종 판정 텍스트에서 종목 코드를 제거한다(전역 "종목 코드 미표시" 규칙).
 * 라이브 경로는 provider projection 이, 저장 경로(SavedDecisionView·ProdAnalysisQueueCard)는 이 지점이
 * 담당한다 — 두 소비처가 이 훅 하나를 공유하므로 여기서 한 번 정리하면 저장모드 전 표시가 클린해진다.
 * 모듈 레벨 함수(안정 참조)라 TanStack Query 의 select 메모이제이션이 유효하다.
 */
function stripDecisionResponse(res: AIDecisionResponse): AIDecisionResponse {
  if (!res.decision) return res;
  return {
    ...res,
    decision: {
      ...res.decision,
      decision: stripDecisionTickers(res.decision.decision, res.decision.ticker),
    },
  };
}

export function useQueryAIDecision(
  ticker: string,
  enabled = true,
): UseQueryResult<AIDecisionResponse, ApiError> {
  return useQuery<AIDecisionResponse, ApiError, AIDecisionResponse>({
    queryKey: queryKeys.stock.aiDecision(ticker),
    queryFn: ({ signal }) => fetchAIAnalysisDecision(ticker, signal),
    enabled: enabled && ticker.trim().length > 0,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
    // 저장 스냅샷 표시 전 티커 코드 strip(라이브는 provider projection 담당).
    select: stripDecisionResponse,
    // 이 종목이 진행 중(active)이면 ~12s 폴링 → 완료 시 같은 응답으로 결과(decision)+active 종료를
    // 함께 반영해 "분석 중"이 자동으로 결과 카드로 전환된다. active 없으면 폴링 안 함(정지).
    refetchInterval: (query) => (query.state.data?.active ? 12_000 : false),
  });
}
