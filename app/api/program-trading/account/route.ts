import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { validateAccountInput } from "@/lib/server/programTrading/account";
import { allowsLocalProgram } from "@/lib/server/programTrading/localRequest";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  if (!allowsLocalProgram(request)) return NextResponse.json({ error: "로컬 개발 환경에서만 연결할 수 있어요." }, { status: 403, headers });
  try {
    const response = await axios.get("http://127.0.0.1:4318/account", { timeout: 15000, proxy: false, validateStatus: () => true });
    return NextResponse.json(response.data, { status: response.status, headers });
  }
  catch { return NextResponse.json({ error: "한투 잔액을 조회하지 못했어요. 계좌·키·모의/실전 구분을 확인해 주세요." }, { status: 502, headers }); }
}
export async function POST(request: NextRequest) {
  if (!allowsLocalProgram(request, true)) return NextResponse.json({ error: "요청 출처를 확인해 주세요." }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > 4096) return NextResponse.json({ error: "입력 크기를 확인해 주세요." }, { status: 413, headers });
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("empty body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return NextResponse.json({ error: "입력 크기를 확인해 주세요." }, { status: 413, headers });
      }
      chunks.push(chunk.value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  catch { return NextResponse.json({ error: "계좌 입력 형식을 확인해 주세요." }, { status: 400, headers }); }
  if (!validateAccountInput(input)) return NextResponse.json({ error: "계좌번호 8자리·상품코드 2자리와 API 키 형식을 확인해 주세요." }, { status: 400, headers });
  try {
    const response = await axios.post("http://127.0.0.1:4318/account", input, { timeout: 25000, proxy: false, validateStatus: () => true });
    return NextResponse.json(response.data, { status: response.status, headers });
  }
  catch { return NextResponse.json({ error: "한투 연결 또는 설정 저장에 실패했어요. 계좌·키·모의/실전 구분을 확인해 주세요." }, { status: 502, headers }); }
}
