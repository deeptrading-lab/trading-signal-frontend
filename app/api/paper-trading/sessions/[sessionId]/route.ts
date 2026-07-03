import { NextResponse } from "next/server";
import {
  getPaperTradingSessionDetail,
  patchPaperTradingSessionStatus,
} from "@/lib/server/paperTrading/sessionStore";
import type { PatchPaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { sessionId } = await context.params;
  const payload = await getPaperTradingSessionDetail(sessionId);
  if (!payload) {
    return NextResponse.json({ error: "모의투자 세션을 찾지 못했어요." }, { status: 404 });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { sessionId } = await context.params;
  try {
    const body = (await request.json()) as Partial<PatchPaperTradingSessionRequest>;
    if (!body.status || !["running", "paused", "completed"].includes(body.status)) {
      return NextResponse.json({ error: "변경할 세션 상태가 올바르지 않아요." }, { status: 422 });
    }
    const payload = await patchPaperTradingSessionStatus(sessionId, body.status);
    if (!payload) {
      return NextResponse.json({ error: "모의투자 세션을 찾지 못했어요." }, { status: 404 });
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 세션 상태를 바꾸지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
