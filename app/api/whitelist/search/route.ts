/**
 * `/api/whitelist/search` route handler.
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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  let response: Response;
  try {
    response = await fetch(
      `${FASTAPI_BASE_URL}/api/whitelist/search?q=${encodeURIComponent(query)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return NextResponse.json(
      { error: FALLBACK_NETWORK_MESSAGE },
      { status: 502 },
    );
  }

  return passthrough(response);
}

/**
 * BE 응답을 가능한 한 그대로 클라이언트에 전달.
 *   - Content-Type 이 JSON 이면 파싱해서 NextResponse.json 로 그대로 통과.
 *   - JSON 이 아니면 text 로 안전 폴백.
 *   - JSON 파싱 실패 시 한글 폴백 메시지 + 500.
 */
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
