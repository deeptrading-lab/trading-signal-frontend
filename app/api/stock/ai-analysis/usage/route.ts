/**
 * AI 분석 토큰 사용량 집계 (BFF, 읽기 전용).
 *
 * Supabase ai_agent_usage 이력을 받아 provider/agent별 평균으로 집계해 대시보드에 전달한다.
 * - 분석 실행(POST /api/stock/ai-analysis)과 달리 Vercel 가드 없음 → prod 에서도 읽기 동작.
 * - 데이터 소량이라 SQL view/RPC 대신 BFF 에서 JS group-by.
 */

import { NextResponse } from "next/server";
import {
  getAgentUsageRows,
  type AgentUsageRecord,
} from "@/lib/server/ai/agentUsageStore";
import {
  jsonWithDataSource,
  withTimeout,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import { AGENT_ORDER } from "@/lib/types/stock/aiAnalysis";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import type {
  AgentUsageRow,
  AgentUsageSummary,
  ProviderRunStats,
} from "@/lib/types/stock/agentUsage";

const PROVIDERS: AIAnalysisProvider[] = ["claude", "codex"];
const ROW_LIMIT = 1000;
const FALLBACK_TIMEOUT_MESSAGE = "토큰 사용량 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const nums = (xs: (number | null)[]): number[] =>
  xs.filter((n): n is number => n != null);

/**
 * 한 분석가(agent)의 행들을 평균 1행으로 압축.
 * - 토큰/비용 평균은 measured=true 행만 사용(codex는 cost null이라 섞이면 왜곡).
 * - 모델은 가장 최근(=desc 정렬상 첫) 비-null 값.
 * - 소요시간(durationMs)은 measured 무관 전체 행으로 평균(codex도 시간은 잼).
 */
function aggregateAgent(rows: AgentUsageRecord[]): AgentUsageRow {
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

/**
 * run(분석 1회) wall-clock = max(종료) - min(시작), 시작 = created_at - duration_ms.
 * 에이전트 소요의 단순 합이 아니라 구간 span 이라 병렬 단계를 중복 합산하지 않는다.
 */
function runWallClockMs(runRows: AgentUsageRecord[]): number | null {
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

function providerRunStats(provRows: AgentUsageRecord[]): ProviderRunStats {
  const byRun = new Map<string, AgentUsageRecord[]>();
  for (const r of provRows) {
    const list = byRun.get(r.runId) ?? [];
    list.push(r);
    byRun.set(r.runId, list);
  }
  const wallClocks = nums([...byRun.values()].map(runWallClockMs));
  return { avgWallClockMs: mean(wallClocks), runCount: byRun.size };
}

function buildSummary(rows: AgentUsageRecord[]): AgentUsageSummary {
  const byProvider = {} as Record<AIAnalysisProvider, AgentUsageRow[]>;
  const runStatsByProvider = {} as Record<AIAnalysisProvider, ProviderRunStats>;
  for (const provider of PROVIDERS) {
    const provRows = rows.filter((r) => r.provider === provider);
    const byAgent = new Map<string, AgentUsageRecord[]>();
    for (const r of provRows) {
      const list = byAgent.get(r.agentKey) ?? [];
      list.push(r);
      byAgent.set(r.agentKey, list);
    }
    byProvider[provider] = [...byAgent.values()]
      .map(aggregateAgent)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    runStatsByProvider[provider] = providerRunStats(provRows);
  }

  const runIds = new Set(rows.map((r) => r.runId));
  return {
    configured: true,
    runCount: runIds.size,
    byProvider,
    runStatsByProvider,
    // rows 는 created_at desc → 첫 행이 가장 최근 분석.
    latestProvider: rows[0]?.provider ?? null,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(): Promise<Response> {
  try {
    const rows = await withTimeout(getAgentUsageRows(ROW_LIMIT), 5_000);
    if (rows === null) {
      const emptyStats: ProviderRunStats = { avgWallClockMs: null, runCount: 0 };
      const empty: AgentUsageSummary = {
        configured: false,
        runCount: 0,
        byProvider: { claude: [], codex: [] },
        runStatsByProvider: { claude: emptyStats, codex: emptyStats },
        latestProvider: null,
        generatedAt: new Date().toISOString(),
      };
      return jsonWithDataSource(empty, "supabase-unconfigured");
    }
    return jsonWithDataSource(buildSummary(rows), "supabase");
  } catch (error) {
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return NextResponse.json(
        { error: FALLBACK_TIMEOUT_MESSAGE },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "토큰 사용량 조회 중 오류가 발생했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
