/**
 * `/api/workbench/analyze` route handler.
 *
 * 브라우저 → 이 route handler → FastAPI 단방향 흐름의 server-side proxy.
 * PRD AC-2: `FASTAPI_BASE_URL` 환경변수만으로 dev/prod 전환.
 * PRD AC-7: 4xx/5xx 시 BE body 를 그대로 통과시키고, 빈 본문·JSON 파싱 실패 시 한글 폴백.
 */

import { NextRequest, NextResponse } from "next/server";

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
const TIMEOUT_MS = 30_000;
const FALLBACK_NETWORK_MESSAGE =
  "엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_PARSE_MESSAGE =
  "엔진 응답 처리에 실패했어요. 잠시 후 다시 시도해 주세요.";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 해석할 수 없어요. 다시 시도해 주세요." },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${FASTAPI_BASE_URL}/api/workbench/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json(
      { error: FALLBACK_NETWORK_MESSAGE },
      { status: 502 },
    );
  }

  return passthrough(response);
}

async function passthrough(response: Response): Promise<NextResponse> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    let text = "";
    try {
      text = await response.text();
    } catch {
      return NextResponse.json(
        { error: FALLBACK_PARSE_MESSAGE },
        { status: 500 },
      );
    }
    if (text.trim() === "") {
      return NextResponse.json(
        { error: FALLBACK_PARSE_MESSAGE },
        { status: response.status >= 400 ? response.status : 500 },
      );
    }
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": contentType || "text/plain; charset=utf-8" },
    });
  }

  try {
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: FALLBACK_PARSE_MESSAGE },
      { status: 500 },
    );
  }
}
