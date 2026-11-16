import { NextRequest, NextResponse } from "next/server";
import { currentImprovementJob, startImprovementJob } from "@/lib/server/programTrading/improvementJob";
import { allowsLocalProgram } from "@/lib/server/programTrading/localRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET(request: NextRequest) {
  if (!allowsLocalProgram(request)) return respond({ error: "로컬 주소에서 열어 주세요." }, 403);
  return respond(currentImprovementJob());
}

export async function POST(request: NextRequest) {
  if (!allowsLocalProgram(request, true)) return respond({ error: "로컬 주소에서 요청해 주세요." }, 403);
  const body = await request.json().catch(() => null);
  if (typeof body?.sessionId !== "string" || !/^[a-f0-9]{32}$/.test(body.sessionId) ||
      typeof body.evaluationId !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.evaluationId)) {
    return respond({ error: "세션과 평가를 확인해 주세요." }, 400);
  }
  if (!startImprovementJob(body.sessionId, body.evaluationId)) {
    return respond({ error: "다른 개선 작업이 진행 중이에요. 적용 이력 저장까지 마친 뒤 다시 시도해 주세요." }, 409);
  }
  return respond(currentImprovementJob(), 202);
}
