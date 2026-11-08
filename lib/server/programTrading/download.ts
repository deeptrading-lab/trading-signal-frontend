import { NextRequest, NextResponse } from "next/server";
import { allowsLocalProgram } from "./localRequest";
import { getLocalPaperRuntime } from "./localPaperRuntime";

export async function downloadProgramFile(request: NextRequest, kind: "logs" | "review") {
  const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  if (!allowsLocalProgram(request)) return fail(403, "로컬 주소에서 자동매매 화면을 열어 주세요.");
  try {
    const body = await (await getLocalPaperRuntime()).download(kind);
    return new NextResponse(body, { headers: {
      "Content-Type": kind === "logs" ? "application/x-ndjson; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="program-trading-${kind}.${kind === "logs" ? "jsonl" : "json"}"`,
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fail(404, "아직 생성된 기록이 없어요.");
    return fail(503, "거래 파일을 가져오지 못했어요. 로컬 원장을 확인해 주세요.");
  }
}
