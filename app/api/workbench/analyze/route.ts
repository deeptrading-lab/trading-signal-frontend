/**
 * `/api/workbench/analyze` route handler.
 *
 * 브라우저 → 이 route handler → adapter 단방향 흐름의 server-side proxy.
 *
 * PRD `claude-cli-analysis`:
 *  - §3.1 옵션 A — 같은 endpoint 가 `ANALYZE_BACKEND` 환경변수로 백엔드 분기.
 *    - `fastapi` (기본) → FastAPI BE 호출.
 *    - `claude-cli` → 로컬 claude CLI subprocess 호출.
 *  - §3.7 — `claude-cli` 모드 + Vercel 환경 감지 시 명시적 한글 에러 (런타임 가드).
 *  - AC-1 — 환경변수 미설정/`fastapi` 시 기존 동작 무회귀.
 *  - AC-13 — BFF 단일 진입점 유지: 클라이언트는 이 endpoint 만 호출한다.
 *
 * route handler 자체는 adapter 결과를 그대로 흘려보낸다 (응답 envelope·HTTP status·한글 메시지 모두 adapter 책임).
 */

import { NextRequest, NextResponse } from "next/server";

import { createAnalyzeAdapter, resolveBackend } from "../_adapters";
import { isVercelEnv } from "@/lib/server/env";

import type { AnalyzeRequest } from "@/lib/types/workbench/analyze";

const MSG_VERCEL_UNSUPPORTED =
  "Vercel 환경에서는 claude CLI 모드를 사용할 수 없습니다. 로컬 환경에서 실행해 주세요.";

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

  // adapter 가 1차 책임이지만, route handler 진입부에서도 한 번 더 가드 (조기 반환 + 명확성).
  const backend = resolveBackend();
  if (backend === "claude-cli" && isVercelEnv()) {
    return NextResponse.json(
      { error: MSG_VERCEL_UNSUPPORTED },
      { status: 503 },
    );
  }

  const adapter = createAnalyzeAdapter(backend);
  const result = await adapter.analyze(body as AnalyzeRequest);

  if (result.ok) {
    return NextResponse.json(result.data, { status: 200 });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
