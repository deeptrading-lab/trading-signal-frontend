import { NextRequest, NextResponse } from "next/server";
import { allowsLocalProgram } from "@/lib/server/programTrading/localRequest";
import { readProgramAccount } from "@/lib/server/programTrading/accountIdentity";
import { getLocalPaperRuntime } from "@/lib/server/programTrading/localPaperRuntime";
import { readProgramAssets } from "@/lib/server/programTrading/assetsStore";
import { isProgramAssets } from "@/lib/validation/programTrading/assets";
import { PROGRAM_ASSETS_COPY as C } from "@/lib/copy/programTrading/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function handle(request: NextRequest) {
  if (!allowsLocalProgram(request, request.method === "POST")) return respond({ error: "로컬 주소에서 열어 주세요." }, 403);
  const ownerSub = await readProgramAccount(request);
  if (!ownerSub) return respond({ error: C.login }, 428);
  try {
    if (request.method === "GET") return respond(await readProgramAssets(ownerSub));
    const body = await request.json().catch(() => null);
    if (!isProgramAssets(body?.amount)) return respond({ error: C.invalid }, 400);
    const paper = await getLocalPaperRuntime(ownerSub);
    return respond(await paper.saveAssets(body.amount));
  } catch (error) {
    const message = error instanceof Error ? error.message : C.database;
    return respond({ error: message }, message === C.locked ? 409 : 503);
  }
}
export { handle as GET, handle as POST };
