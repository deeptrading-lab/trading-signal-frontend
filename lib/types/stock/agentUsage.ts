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

/**
 * run(분석 1회) 1건의 시계열 포인트 — 시간축 추세·회귀 감지용.
 * 평균으로 뭉개는 AgentUsageRow 와 달리 run 단위 원시 합계를 보존한다.
 */
export interface RunSeriesPoint {
  runId: string;
  ticker: string;
  /** run 종료 시각(ISO) = 해당 run 행들의 max(created_at) */
  endedAt: string;
  /** run wall-clock(ms). 산출은 ProviderRunStats 와 동일(span). */
  wallClockMs: number | null;
  /** 측정 비용 합(USD). 측정 행이 없으면(codex) null */
  totalCost: number | null;
  /** 입력 토큰 합 = 신규 입력 + 캐시 읽기 (measured 행) */
  totalInput: number;
  totalOutput: number;
  totalCacheCreation: number;
  /** 이 run 에 기록된 에이전트 행 수 */
  agentCount: number;
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
  /** provider별 run 시계열 (오래된→최신 정렬). 추세·회귀 감지 차트용. */
  runSeriesByProvider: Record<AIAnalysisProvider, RunSeriesPoint[]>;
  /** 가장 최근 분석을 실행한 provider (대시보드 기본 탭 정합용). 데이터 없으면 null */
  latestProvider: AIAnalysisProvider | null;
  generatedAt: string;
}
