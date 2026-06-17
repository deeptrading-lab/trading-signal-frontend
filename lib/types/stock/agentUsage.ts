/**
 * AI 분석 토큰 사용량 대시보드 — BFF 집계 응답 타입.
 * 원본 이력(ai_agent_usage)을 provider/agent별로 평균 집계한 형태.
 */

import type { AgentKey, AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

/** 분석가(agent) 1명의 평균 토큰 사용량 (provider 컷 적용 후). */
export interface AgentUsageRow {
  agentKey: AgentKey;
  /** A=분석가, B=토론, C=매니저 체인 */
  stage: "A" | "B" | "C";
  /** AGENT_ORDER 기준 정렬 인덱스 (단계별 누적 추세 차트용) */
  orderIndex: number;
  /** 집계에 포함된 전체 행 수 */
  sampleCount: number;
  /** 그중 토큰이 실제 측정된 행 수 (measured=true) */
  measuredCount: number;
  avgInputTokens: number | null;
  avgOutputTokens: number | null;
  avgCacheReadTokens: number | null;
  avgCacheCreationTokens: number | null;
  /** 0~1. sum(cacheRead) / (sum(input) + sum(cacheRead)) */
  cacheHitRate: number | null;
  avgCostUsd: number | null;
}

/** /api/stock/ai-analysis/usage 응답. */
export interface AgentUsageSummary {
  /** Supabase 미설정이면 false → 대시보드가 안내 표시 */
  configured: boolean;
  /** 집계에 포함된 distinct run_id 수 */
  runCount: number;
  byProvider: Record<AIAnalysisProvider, AgentUsageRow[]>;
  generatedAt: string;
}
