import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { allowsLocalProgram } from "./localRequest";
export async function downloadProgramFile(request: NextRequest, kind: "logs" | "review") {
  if (!allowsLocalProgram(request)) return NextResponse.json({ error: "로컬 개발 환경에서만 확인할 수 있어요." }, { status: 403 });
  try {
    const response = await axios.get(`http://127.0.0.1:4318/${kind}`, { responseType: "text", timeout: 5000, proxy: false, validateStatus: () => true, transformResponse: [value => value] });
    return new NextResponse(response.data, { status: response.status, headers: {
      "Content-Type": kind === "logs" ? "application/x-ndjson; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="program-trading-${kind}.${kind === "logs" ? "jsonl" : "json"}"`,
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch { return NextResponse.json({ error: "거래 파일을 가져오지 못했어요. 엔진 연결을 확인해 주세요." }, { status: 503 }); }
}
