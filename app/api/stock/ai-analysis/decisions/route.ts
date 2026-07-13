/**
 * `/api/stock/ai-analysis/decisions` — 저장된 AI 분석 결론 목록 + 카드별 토큰 합계 (BFF, 읽기 전용).
 *
 * 브라우저는 Supabase를 직접 호출하지 않고 이 BFF를 통해 "지금까지 분석한 종목들"을 최신순으로 읽는다.
 * - 결론: ai_analysis_decisions (종목당 최신 1건 upsert) → 그대로 최신순 목록.
 * - 토큰: ai_agent_usage 를 종목별로 그룹 → 각 종목의 최신 run_id 행들만 합산해 카드에 붙인다.
 *   (decisions 에 run_id 컬럼이 없어 usage 의 created_at 최신 run 을 그 종목의 "이 분석"으로 본다.)
 * - 분석 실행(POST /api/stock/ai-analysis)과 달리 Vercel 가드 없음 → prod 에서도 읽기 동작.
 * - 권한: 로그인 유저 전체(analyze-open-access — 메뉴 개방과 함께 admin 가드 제거). 로그인 자체는
 *   전역 proxy 게이트가 담당. 파괴적 작업(삭제)은 별도 라우트의 superadmin 가드 유지.
 */

import { NextResponse } from "next/server";
import {
  getAllAIDecisions,
  isAIDecisionStoreConfigured,
} from "@/lib/server/ai/decisionStore";
import { getActiveJobs } from "@/lib/server/ai/queueStore";
import { mergeActiveJobs } from "@/lib/server/ai/inflightMerge";
import {
  getAgentUsageRows,
  type AgentUsageRecord,
} from "@/lib/server/ai/agentUsageStore";
import {
  jsonWithDataSource,
  withTimeout,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import type {
  AIDecisionListItem,
  AIDecisionListResponse,
  AIDecisionTokens,
} from "@/lib/types/stock/aiAnalysisDecisions";

const ROW_LIMIT = 1000;
const FALLBACK_TIMEOUT_MESSAGE = "분석 결과 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

/**
 * usage rows 를 ticker별로 모아, 각 ticker 의 "최신 run"(created_at 최대 행이 속한 run_id) 토큰을 합산한다.
 * getAgentUsageRows 는 created_at.desc 정렬이라 ticker 별 첫 등장 행의 run_id 가 곧 최신 run.
 */
function buildTokensByTicker(
  rows: AgentUsageRecord[],
): Map<string, AIDecisionTokens> {
  const latestRunByTicker = new Map<string, string>();
  const rowsByRun = new Map<string, AgentUsageRecord[]>();

  for (const r of rows) {
    if (!latestRunByTicker.has(r.ticker)) {
      latestRunByTicker.set(r.ticker, r.runId);
    }
    const list = rowsByRun.get(r.runId) ?? [];
    list.push(r);
    rowsByRun.set(r.runId, list);
  }

  const out = new Map<string, AIDecisionTokens>();
  for (const [ticker, runId] of latestRunByTicker) {
    const runRows = rowsByRun.get(runId) ?? [];
    const measured = runRows.every((r) => r.measured);
    const sum = (pick: (r: AgentUsageRecord) => number | null): number | null => {
      if (!measured) return null;
      return runRows.reduce((acc, r) => acc + (pick(r) ?? 0), 0);
    };
    out.set(ticker, {
      runId,
      totalInputTokens: sum(
        (r) =>
          (r.inputTokens ?? 0) +
          (r.cacheReadInputTokens ?? 0) +
          (r.cacheCreationInputTokens ?? 0),
      ),
      totalOutputTokens: sum((r) => r.outputTokens),
      totalCostUsd: sum((r) => r.costUsd),
      measured,
    });
  }
  return out;
}

export async function GET(): Promise<Response> {
  try {
    const [decisions, usageRows, activeJobs] = await withTimeout(
      Promise.all([
        getAllAIDecisions(),
        getAgentUsageRows(ROW_LIMIT),
        getActiveJobs(),
      ]),
      5_000,
    );

    const tokensByTicker = buildTokensByTicker(usageRows ?? []);
    const decidedItems: AIDecisionListItem[] = decisions.map((snapshot) => ({
      ...snapshot,
      tokens: tokensByTicker.get(snapshot.ticker) ?? null,
    }));

    // 완료 결과 + 활성 작업 합성 — 재분석중은 item.reanalysis, 결과없는 진행중은 inflight 플레이스홀더(순수 함수).
    const { items, inflight } = mergeActiveJobs(decidedItems, activeJobs ?? []);

    const payload: AIDecisionListResponse = {
      configured: isAIDecisionStoreConfigured(),
      items,
      inflight,
      generatedAt: new Date().toISOString(),
    };
    return jsonWithDataSource(
      payload,
      payload.configured ? "supabase" : "supabase-unconfigured",
    );
  } catch (error) {
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return NextResponse.json(
        { error: FALLBACK_TIMEOUT_MESSAGE },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "분석 결과 조회 중 오류가 발생했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
