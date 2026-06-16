/**
 * `/api/stock/ai-analysis/decision` — ticker 별 저장된 최신 AI 분석 결론 조회.
 *
 * 브라우저는 Supabase를 직접 호출하지 않고 이 BFF를 통해 이전 Portfolio Manager 결론만 읽는다.
 * Supabase 미설정 또는 저장된 결론 없음은 모두 `decision: null` 로 반환해 로컬 분석 진입을 막지 않는다.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLatestAIDecision,
  isAIDecisionStoreConfigured,
} from "@/lib/server/ai/decisionStore";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "");

  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400 });
  }

  const decision = await getLatestAIDecision(ticker);

  return NextResponse.json(
    {
      configured: isAIDecisionStoreConfigured(),
      decision,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
