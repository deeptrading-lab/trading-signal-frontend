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
import type { AgentUsageRow, AgentUsageSummary } from "@/lib/types/stock/agentUsage";

const PROVIDERS: AIAnalysisProvider[] = ["claude", "codex"];
const ROW_LIMIT = 1000;
const FALLBACK_TIMEOUT_MESSAGE = "토큰 사용량 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const nums = (xs: (number | null)[]): number[] =>
  xs.filter((n): n is number => n != null);

/** 한 분석가(agent)의 행들을 평균 1행으로 압축. 토큰 평균은 measured=true 행만 사용. */
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
    avgInputTokens: mean(inputs),
    avgOutputTokens: mean(nums(measured.map((r) => r.outputTokens))),
    avgCacheReadTokens: mean(cacheReads),
    avgCacheCreationTokens: mean(nums(measured.map((r) => r.cacheCreationInputTokens))),
    cacheHitRate: denom > 0 ? sumCacheRead / denom : null,
    avgCostUsd: mean(nums(measured.map((r) => r.costUsd))),
  };
}

function buildSummary(rows: AgentUsageRecord[]): AgentUsageSummary {
  const byProvider = {} as Record<AIAnalysisProvider, AgentUsageRow[]>;
  for (const provider of PROVIDERS) {
    const byAgent = new Map<string, AgentUsageRecord[]>();
    for (const r of rows) {
      if (r.provider !== provider) continue;
      const list = byAgent.get(r.agentKey) ?? [];
      list.push(r);
      byAgent.set(r.agentKey, list);
    }
    byProvider[provider] = [...byAgent.values()]
      .map(aggregateAgent)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const runIds = new Set(rows.map((r) => r.runId));
  return {
    configured: true,
    runCount: runIds.size,
    byProvider,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(): Promise<Response> {
  try {
    const rows = await withTimeout(getAgentUsageRows(ROW_LIMIT), 5_000);
    if (rows === null) {
      const empty: AgentUsageSummary = {
        configured: false,
        runCount: 0,
        byProvider: { claude: [], codex: [] },
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
