/**
 * A/B 비교 — 한 session(실험 배치)의 config 별 토큰/비용/지연 Δ + 결정 품질 프록시 + 무회귀 판정.
 *
 * 데이터 소스 3개를 run_id 로 조인(전부 기존 store 재사용):
 * - ab_run_config: run_id → config_id
 * - ai_agent_usage: run 별 토큰/비용/지연
 * - signal_scorecard: run 별 결정(verdict/confidence/target/stop/signal)
 *
 * 품질 프록시는 시장 결과를 안 기다리는 즉시 지표(verdict 일치율·confidence 분포·정량 drift).
 * 사후 horizon hit-rate 비교는 채점 cron 후 별도(후속).
 */

import {
  getAbRunConfigsBySession,
  isAbRunConfigStoreConfigured,
} from "@/lib/server/ai/abRunConfigStore";
import {
  getAgentUsageRows,
  type AgentUsageRecord,
} from "@/lib/server/ai/agentUsageStore";
import { getAllScorecardRows } from "@/lib/server/scorecard/scorecardStore";
import {
  aggregateAgentRows,
  runStats,
  runWallClockMs,
  mean,
  nums,
} from "@/lib/server/ai/usageAggregate";
import { buildWasteReport } from "./waste";
import type { ScorecardRow } from "@/lib/types/scorecard/scorecard";
import type {
  AbComparison,
  ConfigDelta,
  ConfigPerRunTokens,
  ConfigRunHealth,
  ConfigStats,
} from "@/lib/types/stock/abHarness";
import {
  AB_VERDICT_AGREEMENT_MIN,
  AB_TARGET_DRIFT_MAX,
  AB_STOP_DRIFT_MAX,
  AB_MIN_COMMON_TICKERS,
  AB_CONFIDENCE_DROP_MAX,
} from "./constants";

const ROW_LIMIT = 2000;
const LONG_AGENT_DURATION_MS = 10 * 60 * 1000;

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

function perRunTokens(rows: AgentUsageRecord[]): ConfigPerRunTokens {
  const byRun = new Map<string, AgentUsageRecord[]>();
  for (const r of rows) {
    const list = byRun.get(r.runId) ?? [];
    list.push(r);
    byRun.set(r.runId, list);
  }
  const totals = [...byRun.values()].map((rr) => {
    const m = rr.filter((x) => x.measured);
    return {
      newInput: sum(nums(m.map((x) => x.inputTokens))),
      cacheRead: sum(nums(m.map((x) => x.cacheReadInputTokens))),
      cacheCreation: sum(nums(m.map((x) => x.cacheCreationInputTokens))),
      output: sum(nums(m.map((x) => x.outputTokens))),
      cost: sum(nums(m.map((x) => x.costUsd))),
    };
  });
  return {
    newInputTokens: mean(totals.map((t) => t.newInput)),
    cacheReadTokens: mean(totals.map((t) => t.cacheRead)),
    cacheCreationTokens: mean(totals.map((t) => t.cacheCreation)),
    outputTokens: mean(totals.map((t) => t.output)),
    costUsd: mean(totals.map((t) => t.cost)),
  };
}

function countBy<T>(rows: T[], pick: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = pick(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function maxOrNull(xs: number[]): number | null {
  return xs.length ? Math.max(...xs) : null;
}

/** ticker 별 최빈 verdict(반복 run 중 다수결). */
function modeVerdictByTicker(rows: ScorecardRow[]): Map<string, string> {
  const byTicker = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = byTicker.get(r.ticker) ?? new Map<string, number>();
    m.set(r.verdict, (m.get(r.verdict) ?? 0) + 1);
    byTicker.set(r.ticker, m);
  }
  const out = new Map<string, string>();
  for (const [ticker, counts] of byTicker) {
    let best = "";
    let bestN = -1;
    for (const [v, n] of counts) if (n > bestN) { best = v; bestN = n; }
    out.set(ticker, best);
  }
  return out;
}

const VERDICT_ORDINAL: Record<string, number> = {
  BUY: 0,
  OVERWEIGHT: 1,
  HOLD: 2,
  UNDERWEIGHT: 3,
  REDUCE: 4,
  SELL: 5,
};

function verdictDirection(verdict: string): "bullish" | "neutral" | "bearish" | null {
  if (verdict === "BUY" || verdict === "OVERWEIGHT") return "bullish";
  if (verdict === "HOLD") return "neutral";
  if (verdict === "UNDERWEIGHT" || verdict === "REDUCE" || verdict === "SELL") return "bearish";
  return null;
}

export function verdictOrdinalDistance(
  baseVerdicts: Map<string, string>,
  cfgVerdicts: Map<string, string>,
): number | null {
  const diffs: number[] = [];
  for (const [ticker, base] of baseVerdicts) {
    const other = cfgVerdicts.get(ticker);
    const baseOrd = VERDICT_ORDINAL[base];
    const otherOrd = other == null ? undefined : VERDICT_ORDINAL[other];
    if (baseOrd == null || otherOrd == null) continue;
    diffs.push(Math.abs(otherOrd - baseOrd));
  }
  return mean(diffs);
}

export function verdictDirectionAgreementRate(
  baseVerdicts: Map<string, string>,
  cfgVerdicts: Map<string, string>,
): number | null {
  let common = 0;
  let agree = 0;
  for (const [ticker, base] of baseVerdicts) {
    const other = cfgVerdicts.get(ticker);
    const baseDirection = verdictDirection(base);
    const otherDirection = other == null ? null : verdictDirection(other);
    if (baseDirection == null || otherDirection == null) continue;
    common += 1;
    if (baseDirection === otherDirection) agree += 1;
  }
  return common > 0 ? agree / common : null;
}

/** ticker 별 평균값(null 제외). */
function avgByTicker(rows: ScorecardRow[], pick: (r: ScorecardRow) => number | null): Map<string, number> {
  const byTicker = new Map<string, number[]>();
  for (const r of rows) {
    const v = pick(r);
    if (v == null) continue;
    const arr = byTicker.get(r.ticker) ?? [];
    arr.push(v);
    byTicker.set(r.ticker, arr);
  }
  const out = new Map<string, number>();
  for (const [ticker, arr] of byTicker) {
    const m = mean(arr);
    if (m != null) out.set(ticker, m);
  }
  return out;
}

function deltaPct(base: number | null, other: number | null): number | null {
  if (base == null || other == null || base === 0) return null;
  return (other - base) / base;
}

function totalInputTokens(tokens: ConfigPerRunTokens): number | null {
  const fresh = tokens.newInputTokens;
  const cache = tokens.cacheReadTokens;
  if (fresh == null && cache == null) return null;
  return (fresh ?? 0) + (cache ?? 0);
}

export function buildRunHealth(
  usageRows: AgentUsageRecord[],
  scRows: ScorecardRow[],
): ConfigRunHealth {
  const byRun = new Map<string, AgentUsageRecord[]>();
  for (const r of usageRows) {
    const list = byRun.get(r.runId) ?? [];
    list.push(r);
    byRun.set(r.runId, list);
  }
  const scorecardRunIds = new Set(scRows.map((r) => r.runId).filter((runId): runId is string => !!runId));
  const wallClocks = nums([...byRun.values()].map(runWallClockMs));

  return {
    completedRunCount: scorecardRunIds.size,
    incompleteRunCount: Math.max(0, byRun.size - scorecardRunIds.size),
    unmeasuredAgentCount: usageRows.filter((r) => !r.measured).length,
    longAgentCount: usageRows.filter((r) => (r.durationMs ?? 0) >= LONG_AGENT_DURATION_MS).length,
    medianWallClockMs: median(wallClocks),
    worstWallClockMs: maxOrNull(wallClocks),
  };
}

/** 공통 ticker 의 두 맵 평균값 |Δ| 평균. */
function driftBetween(a: Map<string, number>, b: Map<string, number>): number | null {
  const diffs: number[] = [];
  for (const [ticker, av] of a) {
    const bv = b.get(ticker);
    if (bv == null) continue;
    diffs.push(Math.abs(bv - av));
  }
  return mean(diffs);
}

function highRatio(counts: Record<string, number>): number | null {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (counts.HIGH ?? 0) / total;
}

function buildConfigStats(
  configId: string,
  configLabel: string | null,
  usageRows: AgentUsageRecord[],
  scRows: ScorecardRow[],
): ConfigStats {
  return {
    configId,
    configLabel,
    runCount: new Set(usageRows.map((r) => r.runId)).size,
    avgWallClockMs: runStats(usageRows).avgWallClockMs,
    runHealth: buildRunHealth(usageRows, scRows),
    perRun: perRunTokens(usageRows),
    verdictCounts: countBy(scRows, (r) => r.verdict),
    confidenceCounts: countBy(scRows, (r) => r.decisionConfidence),
    agents: aggregateAgentRows(usageRows),
  };
}

function buildDelta(
  baseSc: ScorecardRow[],
  baseStats: ConfigStats,
  cfgSc: ScorecardRow[],
  cfgStats: ConfigStats,
): ConfigDelta {
  const baseVerdicts = modeVerdictByTicker(baseSc);
  const cfgVerdicts = modeVerdictByTicker(cfgSc);
  const commonT = [...baseVerdicts.keys()].filter((t) => cfgVerdicts.has(t));

  const agree = commonT.filter((t) => baseVerdicts.get(t) === cfgVerdicts.get(t)).length;
  const verdictAgreementRate = commonT.length > 0 ? agree / commonT.length : null;
  const ordinalDistance = verdictOrdinalDistance(baseVerdicts, cfgVerdicts);
  const directionAgreementRate = verdictDirectionAgreementRate(baseVerdicts, cfgVerdicts);

  const targetDrift = driftBetween(
    avgByTicker(baseSc, (r) => r.targetPct),
    avgByTicker(cfgSc, (r) => r.targetPct),
  );
  const stopDrift = driftBetween(
    avgByTicker(baseSc, (r) => r.stopLossPct),
    avgByTicker(cfgSc, (r) => r.stopLossPct),
  );
  const signalDrift = driftBetween(
    avgByTicker(baseSc, (r) => r.signalScore),
    avgByTicker(cfgSc, (r) => r.signalScore),
  );

  const reasons: string[] = [];
  let status: ConfigDelta["status"];
  if (commonT.length < AB_MIN_COMMON_TICKERS) {
    status = "INSUFFICIENT";
    reasons.push(`공통 ticker ${commonT.length}개 < 최소 ${AB_MIN_COMMON_TICKERS}개 — 품질 판정 보류`);
  } else {
    if ((verdictAgreementRate ?? 0) < AB_VERDICT_AGREEMENT_MIN) {
      const direction = directionAgreementRate == null
        ? ""
        : `, 방향 일치 ${Math.round(directionAgreementRate * 100)}%`;
      reasons.push(`verdict 일치율 ${((verdictAgreementRate ?? 0) * 100).toFixed(0)}% < ${AB_VERDICT_AGREEMENT_MIN * 100}%${direction}`);
    }
    if ((targetDrift ?? 0) > AB_TARGET_DRIFT_MAX) {
      reasons.push(`목표가 drift ${(targetDrift ?? 0).toFixed(1)}%p > ${AB_TARGET_DRIFT_MAX}%p`);
    }
    if ((stopDrift ?? 0) > AB_STOP_DRIFT_MAX) {
      reasons.push(`손절 drift ${(stopDrift ?? 0).toFixed(1)}%p > ${AB_STOP_DRIFT_MAX}%p`);
    }
    const baseHigh = highRatio(baseStats.confidenceCounts);
    const cfgHigh = highRatio(cfgStats.confidenceCounts);
    if (baseHigh != null && cfgHigh != null && baseHigh - cfgHigh > AB_CONFIDENCE_DROP_MAX) {
      reasons.push(`HIGH confidence 비율 하락 ${((baseHigh - cfgHigh) * 100).toFixed(0)}%p`);
    }
    status = reasons.length === 0 ? "PASS" : "REVIEW";
  }

  return {
    configId: cfgStats.configId,
    baselineId: baseStats.configId,
    inputDeltaPct: deltaPct(totalInputTokens(baseStats.perRun), totalInputTokens(cfgStats.perRun)),
    costDeltaPct: deltaPct(baseStats.perRun.costUsd, cfgStats.perRun.costUsd),
    wallClockDeltaPct: deltaPct(baseStats.avgWallClockMs, cfgStats.avgWallClockMs),
    cacheCreationDeltaPct: deltaPct(baseStats.perRun.cacheCreationTokens, cfgStats.perRun.cacheCreationTokens),
    outputDeltaPct: deltaPct(baseStats.perRun.outputTokens, cfgStats.perRun.outputTokens),
    commonTickers: commonT.length,
    verdictAgreementRate,
    verdictOrdinalDistance: ordinalDistance,
    directionAgreementRate,
    targetPctDrift: targetDrift,
    stopLossPctDrift: stopDrift,
    signalScoreDrift: signalDrift,
    status,
    reasons,
  };
}

const NOTE =
  "토큰/비용은 Claude CLI 의 API 환산값(구독 실청구 아님). 표본이 작으면(repeats 2~3) 참고용.";

/** 한 session 의 A/B 비교 리포트 생성. baseline = 가장 먼저 생성된 config. */
export async function compareSession(session: string): Promise<AbComparison> {
  const emptyResult = (configured: boolean): AbComparison => ({
    configured,
    session,
    configs: [],
    deltas: [],
    waste: null,
    generatedAt: new Date().toISOString(),
    note: NOTE,
  });

  if (!isAbRunConfigStoreConfigured()) return emptyResult(false);

  const [tags, usageAll, scAll] = await Promise.all([
    getAbRunConfigsBySession(session),
    getAgentUsageRows(ROW_LIMIT),
    getAllScorecardRows(ROW_LIMIT),
  ]);
  if (!tags || tags.length === 0) return emptyResult(true);

  // run_id → config 매핑 + config 등장 순서 보존(baseline = 첫 config).
  const runToConfig = new Map<string, { id: string; label: string | null }>();
  const configOrder: string[] = [];
  const labelById = new Map<string, string | null>();
  for (const t of tags) {
    runToConfig.set(t.runId, { id: t.configId, label: t.configLabel });
    if (!labelById.has(t.configId)) {
      labelById.set(t.configId, t.configLabel);
      configOrder.push(t.configId);
    }
  }

  const usageByConfig = new Map<string, AgentUsageRecord[]>();
  for (const r of usageAll ?? []) {
    const c = runToConfig.get(r.runId);
    if (!c) continue;
    const list = usageByConfig.get(c.id) ?? [];
    list.push(r);
    usageByConfig.set(c.id, list);
  }
  const scByConfig = new Map<string, ScorecardRow[]>();
  for (const r of scAll ?? []) {
    if (!r.runId) continue;
    const c = runToConfig.get(r.runId);
    if (!c) continue;
    const list = scByConfig.get(c.id) ?? [];
    list.push(r);
    scByConfig.set(c.id, list);
  }

  const configs: ConfigStats[] = configOrder.map((id) =>
    buildConfigStats(id, labelById.get(id) ?? null, usageByConfig.get(id) ?? [], scByConfig.get(id) ?? []),
  );

  const baselineId = configOrder[0];
  const baseStats = configs[0];
  const baseSc = scByConfig.get(baselineId) ?? [];

  const deltas: ConfigDelta[] = configs
    .slice(1)
    .map((cfgStats) =>
      buildDelta(baseSc, baseStats, scByConfig.get(cfgStats.configId) ?? [], cfgStats),
    );

  // 낭비 진단은 baseline(현행) 기준.
  const waste = baseStats ? buildWasteReport(baseStats.agents) : null;

  return {
    configured: true,
    session,
    configs,
    deltas,
    waste,
    generatedAt: new Date().toISOString(),
    note: NOTE,
  };
}
