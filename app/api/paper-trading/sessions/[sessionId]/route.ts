import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import {
  getArchivedPaperTradingSessionDetail,
  getPaperTradingSessionDetail,
  patchPaperTradingSession,
} from "@/lib/server/paperTrading/sessionStore";
import {
  PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS,
  type PatchPaperTradingSessionRequest,
} from "@/lib/types/paperTrading/paperTrading";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  // 세션 상세 — prod 만 admin+(로컬 전체), /intraday/[sessionId] 페이지 게이트와 정합.
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const { sessionId } = await context.params;
  // 인메모리 창(최근 20건) 밖 과거 세션은 Supabase 저장본에서 읽기 전용으로 복원한다 —
  // 폴백을 `getPaperTradingSessionDetail` 안이 아니라 여기 두는 이유: 그 함수는 틱 실행·라벨링·
  // 오토파일럿 경로도 호출하므로, 거기에 miss 마다 Supabase 왕복을 얹지 않는다.
  const payload =
    (await getPaperTradingSessionDetail(sessionId)) ??
    (await getArchivedPaperTradingSessionDetail(sessionId));
  if (!payload) {
    return NextResponse.json({ error: "모의투자 세션을 찾지 못했어요." }, { status: 404 });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const { sessionId } = await context.params;
  try {
    const body = (await request.json()) as Partial<PatchPaperTradingSessionRequest>;
    const hasStatus = body.status !== undefined;
    const hasInterval = body.tickIntervalMinutes !== undefined;
    if (!hasStatus && !hasInterval) {
      return NextResponse.json({ error: "변경할 내용이 없어요." }, { status: 422 });
    }
    if (hasStatus && !["running", "paused", "completed"].includes(body.status as string)) {
      return NextResponse.json({ error: "변경할 세션 상태가 올바르지 않아요." }, { status: 422 });
    }
    if (
      hasInterval &&
      !PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS.includes(
        body.tickIntervalMinutes as (typeof PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS)[number],
      )
    ) {
      return NextResponse.json({ error: "판단 주기 값이 올바르지 않아요." }, { status: 422 });
    }
    const payload = await patchPaperTradingSession(sessionId, {
      status: body.status,
      tickIntervalMinutes: body.tickIntervalMinutes,
    });
    if (!payload) {
      return NextResponse.json({ error: "모의투자 세션을 찾지 못했어요." }, { status: 404 });
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 세션을 수정하지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
