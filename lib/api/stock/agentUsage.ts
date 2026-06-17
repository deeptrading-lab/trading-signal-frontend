/**
 * Stock 도메인 어댑터 — AI 분석 토큰 사용량 집계 조회.
 *
 * 브라우저 → 본 어댑터(httpClient, same-origin `/api`) → BFF `/api/stock/ai-analysis/usage`
 * → Supabase(ai_agent_usage) 단방향. 응답은 이미 provider/agent별 평균으로 집계된 형태.
 */

import { httpClient } from "@/lib/api/client";
import type { AgentUsageSummary } from "@/lib/types/stock/agentUsage";

export type { AgentUsageSummary, AgentUsageRow } from "@/lib/types/stock/agentUsage";

export async function fetchAgentUsageSummary(): Promise<AgentUsageSummary> {
  const response = await httpClient.get<AgentUsageSummary>("/stock/ai-analysis/usage");
  return response.data;
}
