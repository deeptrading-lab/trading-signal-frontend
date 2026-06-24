import { NextResponse } from "next/server";
import { runPaperTradingSessionTick } from "@/lib/server/paperTrading/sessionStore";
import type { RunPaperTradingTickRequest } from "@/lib/types/paperTrading/paperTrading";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { sessionId } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as RunPaperTradingTickRequest;
    const payload = runPaperTradingSessionTick(sessionId, {
      triggeredBy: body.triggeredBy ?? "user",
      tickWindowStart: body.tickWindowStart,
    });
    if (!payload) {
      return NextResponse.json({ error: "모의투자 세션을 찾지 못했어요." }, { status: 404 });
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 재판단을 실행하지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
