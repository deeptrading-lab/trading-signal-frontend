/**
 * 객관적 토큰 낭비 진단 — "어디가 품질 기여 없이 토큰을 많이 먹나".
 *
 * 지표(집계된 AgentUsageRow 에서 파생, 추론 없음):
 * - yield(수율) = 출력 / (신규입력 + 캐시입력). 낮을수록 "많이 읽고 적게 쓰는" 비효율.
 * - cacheCreationShare = 캐시생성 / 총입력(신규+캐시읽기+캐시생성). 높으면 매 run 캐시를
 *   새로 쓰는 구조(프리픽스 불안정 의심) = 품질 0 손실로 줄일 수 있는 1순위 후보.
 */

import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";

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
  /** 출력 / (신규입력 + 캐시읽기). null = 입력 0. */
  yieldRatio: number | null;
  /** 캐시생성 / (신규입력 + 캐시읽기 + 캐시생성). */
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
  /** yield 오름차순(최악=많이 읽고 적게 씀 먼저). */
  agents: AgentWaste[];
  /** 단계(A 분석가 / B 토론 / C 매니저)별 토큰·비용 분포. */
  byStage: StageWaste[];
}

function safeRatio(numer: number | null, denom: number): number | null {
  if (denom <= 0) return null;
  return (numer ?? 0) / denom;
}

function toWaste(r: AgentUsageRow): AgentWaste {
  const input = r.avgInputTokens ?? 0;
  const cacheRead = r.avgCacheReadTokens ?? 0;
  const cacheCreation = r.avgCacheCreationTokens ?? 0;
  return {
    agentKey: r.agentKey,
    stage: r.stage,
    model: r.model,
    avgInputTokens: r.avgInputTokens,
    avgCacheReadTokens: r.avgCacheReadTokens,
    avgCacheCreationTokens: r.avgCacheCreationTokens,
    avgOutputTokens: r.avgOutputTokens,
    avgCostUsd: r.avgCostUsd,
    avgDurationMs: r.avgDurationMs,
    yieldRatio: safeRatio(r.avgOutputTokens, input + cacheRead),
    cacheCreationShare: safeRatio(cacheCreation, input + cacheRead + cacheCreation),
  };
}

/** 집계된 에이전트 행에서 낭비 진단 리포트 생성. */
export function buildWasteReport(rows: AgentUsageRow[]): WasteReport {
  const agents = rows
    .map(toWaste)
    .sort((a, b) => (a.yieldRatio ?? Infinity) - (b.yieldRatio ?? Infinity));

  const stageMap = new Map<"A" | "B" | "C", StageWaste>();
  for (const r of rows) {
    const s = stageMap.get(r.stage) ?? {
      stage: r.stage,
      totalInput: 0,
      totalCacheCreation: 0,
      totalOutput: 0,
      totalCostUsd: 0,
    };
    s.totalInput += (r.avgInputTokens ?? 0) + (r.avgCacheReadTokens ?? 0);
    s.totalCacheCreation += r.avgCacheCreationTokens ?? 0;
    s.totalOutput += r.avgOutputTokens ?? 0;
    s.totalCostUsd += r.avgCostUsd ?? 0;
    stageMap.set(r.stage, s);
  }
  const byStage = [...stageMap.values()].sort((a, b) => a.stage.localeCompare(b.stage));

  return { agents, byStage };
}
