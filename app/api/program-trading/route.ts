import { NextRequest, NextResponse } from "next/server";
import { isTossConfigured } from "@/lib/api/toss/client";
import { allowsLocalProgram } from "@/lib/server/programTrading/localRequest";
import { getLocalPaperRuntime } from "@/lib/server/programTrading/localPaperRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers });

async function handle(request: NextRequest) {
  if (!allowsLocalProgram(request, request.method === "POST")) return fail(403, "로컬 주소에서 자동매매 화면을 열어 주세요.");
  if (!isTossConfigured()) return fail(503, ".env.local에 TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 입력해 주세요.");

  let action: unknown;
  if (request.method === "POST") {
    try { action = (await request.json())?.action; }
    catch { return fail(400, "지원하지 않는 명령이에요."); }
    if (action !== "start" && action !== "pause" && action !== "flatten") return fail(400, "지원하지 않는 명령이에요.");
  }

  try {
    const paper = await getLocalPaperRuntime();
    if (action !== "start" && action !== "pause" && action !== "flatten") return NextResponse.json(await paper.snapshot(), { headers });
    const result = await paper.run(action);
    return result.error ? fail(409, result.error) : NextResponse.json(result.state, { headers });
  } catch {
    return fail(503, "로컬 모의투자를 준비하지 못했어요. 종목 설정과 로컬 원장을 확인해 주세요.");
  }
}

export { handle as GET, handle as POST };
