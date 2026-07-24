import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import {
  respondToAutopilotGuide,
  stopAutopilotRun,
} from "@/lib/server/paperTrading/autopilot/runStore";
import type { PatchAutopilotRunRequest } from "@/lib/types/paperTrading/autopilot";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const { runId } = await context.params;
  try {
    const body = (await request.json()) as Partial<PatchAutopilotRunRequest>;
    const hasStop = body.status === "stopped";
    const hasGuideResponse =
      typeof body.guideResponse?.guideId === "string" &&
      ["performed", "passed"].includes(body.guideResponse.response ?? "");
    if (hasStop === hasGuideResponse) {
      return NextResponse.json({ error: "하나의 명령만 보내 주세요." }, { status: 422 });
    }
    if (body.completeChildSessions !== undefined && typeof body.completeChildSessions !== "boolean") {
      return NextResponse.json({ error: "종료 방식이 올바르지 않아요." }, { status: 422 });
    }
    if (body.completeChildSessions !== undefined && !hasStop) {
      return NextResponse.json({ error: "자식 세션 종료는 중지 명령에서만 사용할 수 있어요." }, { status: 422 });
    }

    if (hasGuideResponse && body.guideResponse) {
      const result = await respondToAutopilotGuide(
        runId,
        body.guideResponse.guideId,
        body.guideResponse.response,
      );
      if (!result.ok) {
        const status = result.reason === "conflict" ? 409 : result.reason === "not_found" ? 404 : 422;
        const error =
          result.reason === "conflict"
            ? "이미 다른 응답으로 확정된 가이드예요."
            : result.reason === "no_position"
              ? "수행한 매수 기록이 없어 매도로 기록할 수 없어요."
              : result.reason === "not_found"
                ? "오늘 가이드를 찾지 못했어요."
                : "유효한 가이드 알림을 찾지 못했어요.";
        return NextResponse.json({ error }, { status });
      }
      return NextResponse.json({ run: result.run }, { headers: { "Cache-Control": "no-store" } });
    }

    const run = await stopAutopilotRun(runId, {
      completeChildSessions: body.completeChildSessions === true,
    });
    if (!run) return NextResponse.json({ error: "실행 중인 모의투자를 찾지 못했어요." }, { status: 404 });
    return NextResponse.json({ run }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 상태를 변경하지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
