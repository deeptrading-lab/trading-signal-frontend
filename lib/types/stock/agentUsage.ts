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
  /** 가장 최근 호출에 사용된 모델 id (opus/sonnet 등). 측정 불가 시 null */
  model: string | null;
  avgInputTokens: number | null;
  avgOutputTokens: number | null;
  avgCacheReadTokens: number | null;
  avgCacheCreationTokens: number | null;
  /** 0~1. sum(cacheRead) / (sum(input) + sum(cacheRead)) */
  cacheHitRate: number | null;
  avgCostUsd: number | null;
  /** 에이전트 1회 호출 평균 소요(ms). measured 무관(codex 포함). */
  avgDurationMs: number | null;
}

/** provider별 run(분석 1회) 단위 소요시간 통계. */
export interface ProviderRunStats {
  /**
   * 분석 1회 평균 wall-clock(ms). 에이전트 소요의 단순 합이 아니라
   * run별 `max(종료) - min(시작)` (시작 = created_at - duration_ms)로 산출 →
   * Phase A·리스크3 병렬 구간을 중복 합산하지 않는다.
   */
  avgWallClockMs: number | null;
  /** 이 provider 의 distinct run_id 수 */
  runCount: number;
}

/** /api/stock/ai-analysis/usage 응답. */
export interface AgentUsageSummary {
  /** Supabase 미설정이면 false → 대시보드가 안내 표시 */
  configured: boolean;
  /** 집계에 포함된 distinct run_id 수 */
  runCount: number;
  byProvider: Record<AIAnalysisProvider, AgentUsageRow[]>;
  /** provider별 run 단위 소요시간 통계 (소요시간 카드용) */
  runStatsByProvider: Record<AIAnalysisProvider, ProviderRunStats>;
  /** 가장 최근 분석을 실행한 provider (대시보드 기본 탭 정합용). 데이터 없으면 null */
  latestProvider: AIAnalysisProvider | null;
  generatedAt: string;
}
