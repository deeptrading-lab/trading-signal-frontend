/**
 * A/B 토큰 최적화 리포트 타입.
 *
 * 서버의 `/api/ab-harness/report` 응답과 클라이언트 UI가 공유한다.
 * 구현 함수는 lib/server/ai/abHarness/* 에 남기고, 타입만 stock 도메인에 둔다.
 */

import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";

export interface ConfigPerRunTokens {
  newInputTokens: number | null;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
}

export interface ConfigRunHealth {
  completedRunCount: number;
  incompleteRunCount: number;
  unmeasuredAgentCount: number;
  longAgentCount: number;
  medianWallClockMs: number | null;
  worstWallClockMs: number | null;
}

export interface ConfigStats {
  configId: string;
  configLabel: string | null;
  runCount: number;
  avgWallClockMs: number | null;
  runHealth: ConfigRunHealth;
  /** 분석 1회(run) 당 평균 토큰/비용. */
  perRun: ConfigPerRunTokens;
  verdictCounts: Record<string, number>;
  confidenceCounts: Record<string, number>;
  agents: AgentUsageRow[];
}

export interface ConfigDelta {
  configId: string;
  baselineId: string;
  inputDeltaPct: number | null;
  costDeltaPct: number | null;
  wallClockDeltaPct: number | null;
  cacheCreationDeltaPct: number | null;
  outputDeltaPct: number | null;
  commonTickers: number;
  verdictAgreementRate: number | null;
  /** 공통 ticker별 verdict 6단계 평균 거리. 0=동일, 1=인접 verdict. */
  verdictOrdinalDistance: number | null;
  /** BUY/OVERWEIGHT=bullish, HOLD=neutral, UNDERWEIGHT/REDUCE/SELL=bearish 방향 일치율. */
  directionAgreementRate: number | null;
  targetPctDrift: number | null;
  stopLossPctDrift: number | null;
  signalScoreDrift: number | null;
  status: "PASS" | "REVIEW" | "INSUFFICIENT";
  reasons: string[];
}

export interface AgentWaste {
  agentKey: string;
  stage: "A" | "B" | "C";
  model: string | null;
  avgInputTokens: number | null;
  avgCacheReadTokens: number | null;
  avgCacheCreationTokens: number | null;
  avgOutputTokens: number | null;
  avgCostUsd: number | null;
  avgDurationMs: number | null;
  yieldRatio: number | null;
  cacheCreationShare: number | null;
}

export interface StageWaste {
  stage: "A" | "B" | "C";
  totalInput: number;
  totalCacheCreation: number;
  totalOutput: number;
  totalCostUsd: number;
}

export interface WasteReport {
  /** yield 오름차순(최악 먼저). */
  agents: AgentWaste[];
  /** 단계(A 분석가 / B 토론 / C 매니저)별 토큰·비용 분포. */
  byStage: StageWaste[];
}

export interface AbComparison {
  configured: boolean;
  session: string;
  configs: ConfigStats[];
  deltas: ConfigDelta[];
  waste: WasteReport | null;
  generatedAt: string;
  note: string;
}
