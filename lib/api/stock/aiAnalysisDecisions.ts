/**
 * Stock 도메인 어댑터 — AI 분석 결과 카드 목록 조회.
 *
 * 브라우저 → 본 어댑터(httpClient, same-origin `/api`) → BFF `/api/stock/ai-analysis/decisions`
 * → Supabase(ai_analysis_decisions + ai_agent_usage) 단방향.
 * 응답은 결론 스냅샷 + 종목별 최신 run 토큰 합계가 이미 합쳐진 형태.
 */

import { httpClient } from "@/lib/api/client";
import type { AIDecisionListResponse } from "@/lib/types/stock/aiAnalysisDecisions";

export type {
  AIDecisionListItem,
  AIDecisionListResponse,
  AIDecisionTokens,
} from "@/lib/types/stock/aiAnalysisDecisions";

export async function fetchAIDecisionList(): Promise<AIDecisionListResponse> {
  const response = await httpClient.get<AIDecisionListResponse>(
    "/stock/ai-analysis/decisions",
  );
  return response.data;
}

/** 저장 분석 결과 삭제 — superadmin 전용(BFF 가 requireSuperadminApi 로 재방어). */
export async function deleteAIAnalysisDecision(ticker: string): Promise<void> {
  await httpClient.delete(`/stock/ai-analysis/decisions/${encodeURIComponent(ticker)}`);
}
