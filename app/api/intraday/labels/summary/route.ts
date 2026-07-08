/**
 * `GET /api/intraday/labels/summary` — 틱 자가채점 라벨 집계(BFF, 읽기 전용). intraday-decision-overhaul PR-2.
 *
 * Supabase `intraday_tick_labels` 를 페이지네이션으로 걷어 출처×액션 버킷 + 시그널 점수대 밴드로
 * 집계한다(클라이언트 집계 — 이 규모에선 충분, PostgREST group-by 회피). 미설정이면
 * `configured:false` + 빈 집계(fail-soft).
 *
 * 게이트: prod 만 admin+(로컬 전체) — /intraday 페이지·paper-trading 라우트와 정합.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import { summarizeLabels } from "@/lib/server/intraday/tickLabels";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: NextRequest): Promise<Response> {
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  try {
    const payload = await summarizeLabels();
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "라벨 집계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500, headers: NO_STORE },
    );
  }
}
