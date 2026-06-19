/**
 * `/api/scorecard/summary` — AI 판정 적중률 집계(BFF, 읽기 전용).
 *
 * PRD `signal-scorecard` §3-3-A.
 * 브라우저는 Supabase 를 직접 호출하지 않고 이 BFF 로 채점 원장 집계를 읽는다.
 * - 차원: verdict별 · confidence별 · horizon별 · signalScore 구간별(보조).
 * - hitRate = hit/(hit+miss)(flat 분모 제외, D3). 채점 0건이면 빈 배열 + 200.
 * - Vercel 가드 없음 → prod 동작(분석 실행만 로컬 전용). 미설정이면 configured:false + 빈 집계.
 */

import { NextResponse } from "next/server";
import {
  getAllScorecardRows,
  isScorecardStoreConfigured,
} from "@/lib/server/scorecard/scorecardStore";
import { countScored, summarizeScorecard } from "@/lib/server/scorecard/summarize";
import {
  jsonWithDataSource,
  withTimeout,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import type { ScorecardSummaryResponse } from "@/lib/types/scorecard/scorecard";

const FALLBACK_TIMEOUT_MESSAGE = "채점 집계 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(): Promise<Response> {
  const configured = isScorecardStoreConfigured();
  if (!configured) {
    const payload: ScorecardSummaryResponse = {
      configured: false,
      cells: [],
      scoredCount: 0,
      totalRows: 0,
      generatedAt: new Date().toISOString(),
    };
    return jsonWithDataSource(payload, "supabase-unconfigured");
  }

  try {
    const rows = await withTimeout(getAllScorecardRows(), 5_000);
    const payload: ScorecardSummaryResponse = {
      configured: true,
      cells: summarizeScorecard(rows),
      scoredCount: countScored(rows),
      totalRows: rows.length,
      generatedAt: new Date().toISOString(),
    };
    return jsonWithDataSource(payload, "supabase");
  } catch (error) {
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return NextResponse.json(
        { error: FALLBACK_TIMEOUT_MESSAGE },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "채점 집계 조회 중 오류가 발생했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
