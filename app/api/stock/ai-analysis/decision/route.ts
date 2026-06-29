/**
 * `/api/stock/ai-analysis/decision` — ticker 별 저장된 최신 AI 분석 결론 + 진행중 여부 조회.
 *
 * 브라우저는 Supabase를 직접 호출하지 않고 이 BFF를 통해 이전 Portfolio Manager 결론을 읽는다.
 * Supabase 미설정 또는 저장된 결론 없음은 모두 `decision: null` 로 반환해 로컬 분석 진입을 막지 않는다.
 * `active`: 이 종목이 분석 큐에서 진행 중(pending/processing)이면 동봉 — prod 패널이 "분석 중" 선제
 * 표시 + 요청 CTA 숨김에 쓴다(unified-analysis-jobs 후속). 큐 미설정/오류 시 null(fail-soft).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLatestAIDecision,
  isAIDecisionStoreConfigured,
} from "@/lib/server/ai/decisionStore";
import { findActiveByTicker } from "@/lib/server/ai/queueStore";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "");

  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400 });
  }

  const [decision, activeRow] = await Promise.all([
    getLatestAIDecision(ticker),
    findActiveByTicker(ticker),
  ]);

  return NextResponse.json(
    {
      configured: isAIDecisionStoreConfigured(),
      decision,
      active: activeRow
        ? { status: activeRow.status as "pending" | "processing" }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
