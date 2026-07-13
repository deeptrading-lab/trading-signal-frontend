import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import { stopAutopilotRun } from "@/lib/server/paperTrading/autopilot/runStore";
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
    // 중지만 허용 — 재개(active 복귀)는 없다(하루 단위 런, 새로 시작이 명확).
    if (body.status !== "stopped") {
      return NextResponse.json({ error: "중지만 지원해요." }, { status: 422 });
    }
    const run = await stopAutopilotRun(runId);
    if (!run) {
      // 남의 런(owner 불일치)도 404 — 이 서버가 오케스트레이션하지 않는 런은 없는 것과 같다.
      return NextResponse.json({ error: "오토파일럿 런을 찾지 못했어요." }, { status: 404 });
    }
    return NextResponse.json({ run }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "오토파일럿을 중지하지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
