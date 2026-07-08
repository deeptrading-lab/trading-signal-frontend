import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import { getPaperTradingAiCliGate } from "@/lib/server/paperTrading/aiCliGate";
import {
  getPaperTradingSessionDetail,
  runPaperTradingSessionTick,
} from "@/lib/server/paperTrading/sessionStore";
import type { RunPaperTradingTickRequest } from "@/lib/types/paperTrading/paperTrading";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  // 재판단(틱) 실행 — prod 만 admin+(로컬 전체). cliGate 는 로컬 CLI 게이트지 role 이 아님.
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const { sessionId } = await context.params;
  try {
    const existing = await getPaperTradingSessionDetail(sessionId);
    if (!existing) {
      return NextResponse.json({ error: "모의투자 세션을 찾지 못했어요." }, { status: 404 });
    }
    if (existing.session.status === "running") {
      const cliGate = getPaperTradingAiCliGate();
      if (!cliGate.ok) {
        return NextResponse.json(
          { error: cliGate.message },
          { status: cliGate.status, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const body = (await request.json().catch(() => ({}))) as RunPaperTradingTickRequest;
    const payload = await runPaperTradingSessionTick(sessionId, {
      triggeredBy: body.triggeredBy ?? "user",
      tickWindowStart: body.tickWindowStart,
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 재판단을 실행하지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
