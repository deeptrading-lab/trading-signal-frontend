/**
 * A/B 하니스 비교 리포트 (BFF, 읽기 전용).
 * GET ?session=<id> → 그 실험 배치의 config 별 토큰/지연 Δ + 품질 프록시 + 낭비 진단.
 * 분석 실행(POST /api/stock/ai-analysis)과 달리 Vercel 가드 없음(읽기만).
 */

import { NextResponse } from "next/server";
import { compareSession } from "@/lib/server/ai/abHarness/compare";
import {
  jsonWithDataSource,
  withTimeout,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

export async function GET(req: Request): Promise<Response> {
  const session = new URL(req.url).searchParams.get("session")?.trim();
  if (!session) {
    return NextResponse.json(
      { error: "session 쿼리 파라미터가 필요합니다." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const report = await withTimeout(compareSession(session), 8_000);
    return jsonWithDataSource(report, "supabase");
  } catch (error) {
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return NextResponse.json(
        { error: "A/B 리포트 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요." },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "A/B 리포트 조회 중 오류가 발생했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
