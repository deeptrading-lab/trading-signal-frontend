/**
 * `DELETE /api/stock/ai-analysis/decisions/[ticker]` — 저장된 AI 분석 결과 삭제 (BFF).
 *
 * **superadmin 전용**(requireSuperadminApi, 환경 무관) — 레거시 결과 정리용 파괴적 작업.
 * ai_analysis_decisions 는 ticker PK 라 종목당 1행 삭제.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireSuperadminApi } from "@/lib/server/auth/apiGuard";
import { deleteAIDecision } from "@/lib/server/ai/decisionStore";

type RouteContext = {
  params: Promise<{ ticker: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const denied = await requireSuperadminApi(request);
  if (denied) return denied;

  const { ticker } = await context.params;
  if (!ticker.trim()) {
    return NextResponse.json(
      { error: "종목 코드가 없어요." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await deleteAIDecision(ticker);
  if (!result.ok) {
    return NextResponse.json(
      { error: "분석 결과를 삭제하지 못했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
