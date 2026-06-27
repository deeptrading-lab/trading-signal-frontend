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
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import type {
  AgentUsageRow,
  AgentUsageSummary,
  ProviderRunStats,
} from "@/lib/types/stock/agentUsage";
import { aggregateAgentRows, runStats } from "@/lib/server/ai/usageAggregate";

const PROVIDERS: AIAnalysisProvider[] = ["claude", "codex"];
const ROW_LIMIT = 1000;
const FALLBACK_TIMEOUT_MESSAGE = "토큰 사용량 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

function buildSummary(rows: AgentUsageRecord[]): AgentUsageSummary {
  const byProvider = {} as Record<AIAnalysisProvider, AgentUsageRow[]>;
  const runStatsByProvider = {} as Record<AIAnalysisProvider, ProviderRunStats>;
  for (const provider of PROVIDERS) {
    const provRows = rows.filter((r) => r.provider === provider);
    byProvider[provider] = aggregateAgentRows(provRows);
    runStatsByProvider[provider] = runStats(provRows);
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
