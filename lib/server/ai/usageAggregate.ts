/**
 * ai_agent_usage 집계 공용 유틸 — 토큰 대시보드(usage/route)와 A/B 하니스(compare/waste)가 공유.
 *
 * 집계 정책:
 * - 토큰/비용 평균은 measured=true 행만(codex 는 cost null 이라 섞이면 왜곡).
 * - 모델 = 가장 최근(desc 정렬상 첫) 비-null.
 * - 소요시간(durationMs)은 measured 무관 전체 행.
 * - run wall-clock = max(종료)-min(시작), 시작 = created_at - duration_ms (병렬 구간 중복합산 방지).
 */

import type { AgentUsageRecord } from "@/lib/server/ai/agentUsageStore";
import { AGENT_ORDER } from "@/lib/types/stock/aiAnalysis";
import type {
  AgentUsageRow,
  ProviderRunStats,
  RunSeriesPoint,
} from "@/lib/types/stock/agentUsage";

export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export const nums = (xs: (number | null)[]): number[] =>
  xs.filter((n): n is number => n != null);

/** 한 분석가(agent)의 행들을 평균 1행으로 압축. */
export function aggregateAgent(rows: AgentUsageRecord[]): AgentUsageRow {
  const measured = rows.filter((r) => r.measured);
  const inputs = nums(measured.map((r) => r.inputTokens));
  const cacheReads = nums(measured.map((r) => r.cacheReadInputTokens));
  const sumInput = inputs.reduce((a, b) => a + b, 0);
  const sumCacheRead = cacheReads.reduce((a, b) => a + b, 0);
  const denom = sumInput + sumCacheRead;
  return {
    agentKey: rows[0].agentKey,
    stage: rows[0].stage,
    orderIndex: AGENT_ORDER.indexOf(rows[0].agentKey),
    sampleCount: rows.length,
    measuredCount: measured.length,
    model: rows.find((r) => r.model)?.model ?? null,
    avgInputTokens: mean(inputs),
    avgOutputTokens: mean(nums(measured.map((r) => r.outputTokens))),
    avgCacheReadTokens: mean(cacheReads),
    avgCacheCreationTokens: mean(nums(measured.map((r) => r.cacheCreationInputTokens))),
    cacheHitRate: denom > 0 ? sumCacheRead / denom : null,
    avgCostUsd: mean(nums(measured.map((r) => r.costUsd))),
    avgDurationMs: mean(nums(rows.map((r) => r.durationMs))),
  };
}

/** 행들을 agentKey 별로 묶어 AGENT_ORDER 순으로 정렬된 집계 배열로. */
export function aggregateAgentRows(rows: AgentUsageRecord[]): AgentUsageRow[] {
  const byAgent = new Map<string, AgentUsageRecord[]>();
  for (const r of rows) {
    const list = byAgent.get(r.agentKey) ?? [];
    list.push(r);
    byAgent.set(r.agentKey, list);
  }
  return [...byAgent.values()]
    .map(aggregateAgent)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

/** run(분석 1회) wall-clock = max(종료)-min(시작). 시작 = created_at - duration_ms. */
export function runWallClockMs(runRows: AgentUsageRecord[]): number | null {
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const r of runRows) {
    const end = Date.parse(r.createdAt);
    if (Number.isNaN(end)) continue;
    const start = end - (r.durationMs ?? 0);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }
  if (minStart === Infinity || maxEnd === -Infinity) return null;
  return Math.max(0, maxEnd - minStart);
}

/** 행 집합의 run 단위 wall-clock 평균 + distinct run 수. */
export function runStats(rows: AgentUsageRecord[]): ProviderRunStats {
  const byRun = new Map<string, AgentUsageRecord[]>();
  for (const r of rows) {
    const list = byRun.get(r.runId) ?? [];
    list.push(r);
    byRun.set(r.runId, list);
  }
  const wallClocks = nums([...byRun.values()].map(runWallClockMs));
  return { avgWallClockMs: mean(wallClocks), runCount: byRun.size };
}

/** 한 run(행 묶음)을 시계열 포인트 1개로 압축. */
function toRunPoint(runRows: AgentUsageRecord[]): RunSeriesPoint {
  const measured = runRows.filter((r) => r.measured);
  const costs = nums(measured.map((r) => r.costUsd));
  let endedAtMs = -Infinity;
  for (const r of runRows) {
    const t = Date.parse(r.createdAt);
    if (!Number.isNaN(t) && t > endedAtMs) endedAtMs = t;
  }
  const endedAt =
    endedAtMs === -Infinity ? runRows[0].createdAt : new Date(endedAtMs).toISOString();
  const sum = (pick: (r: AgentUsageRecord) => number | null): number =>
    measured.reduce((a, r) => a + (pick(r) ?? 0), 0);
  return {
    runId: runRows[0].runId,
    ticker: runRows[0].ticker,
    endedAt,
    wallClockMs: runWallClockMs(runRows),
    totalCost: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
    totalInput: sum((r) => r.inputTokens) + sum((r) => r.cacheReadInputTokens),
    totalOutput: sum((r) => r.outputTokens),
    totalCacheCreation: sum((r) => r.cacheCreationInputTokens),
    agentCount: runRows.length,
  };
}

/** 행 집합을 run 단위로 묶어 종료 시각 오름차순(오래된→최신) 시계열로. */
export function runSeries(rows: AgentUsageRecord[]): RunSeriesPoint[] {
  const byRun = new Map<string, AgentUsageRecord[]>();
  for (const r of rows) {
    const list = byRun.get(r.runId) ?? [];
    list.push(r);
    byRun.set(r.runId, list);
  }
  return [...byRun.values()]
    .map(toRunPoint)
    .sort((a, b) => Date.parse(a.endedAt) - Date.parse(b.endedAt));
}
