/**
 * `/api/auth/me` — 현재 세션 신원(role) 읽기전용 조회(BFF, Node 런타임).
 *
 * PRD `market-status-aware-home` §3-5 / AC-9·AC-10. 관리자 전용 "다시 시도" 버튼 게이트의 서버측 진실.
 *   - 쿠키에서 `readSession`(HMAC 검증 후 role)만 읽는다 — **읽기전용**(로그인/세션 발급 로직 무접촉).
 *   - 위조 `role=admin` 쿠키는 서명 검증 실패로 걸러져 `role: null`(AC-10).
 *   - 미인증/시크릿 부재도 200 `{ role: null, isAdmin: false }` — **401 아님**. 이미 게이트를 통과한
 *     세션의 role 조회이므로 401 을 주면 axios 인터셉터가 `/login` 무한 리다이렉트를 유발한다(§8).
 */

import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { AuthMeResponse } from "@/lib/types/auth/me";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  const role = identity?.role ?? null;
  const body: AuthMeResponse = { role, isAdmin: role === "admin" };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
