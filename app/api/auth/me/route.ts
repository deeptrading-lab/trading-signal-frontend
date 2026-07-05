/**
 * `GET /api/auth/me` — 현재 세션 신원(role·email) 반환 (BFF).
 *
 * user-login-auth Phase 2 — 클라이언트가 **role-aware UI**(관리자 전용 표시 등)를 그리도록
 * 현재 사용자의 role/email 을 노출한다. 세션 쿠키(`app_auth`)를 `readSession`(HMAC 서명검증)으로
 * 읽어 반환하며, 위조·만료·미인증·시크릿 미설정은 `authenticated:false`.
 *
 * ⚠️ `/api/auth/*` 공개경로(게이트 예외)라 미인증에서도 호출 가능 — 반환 데이터는 **쿠키 소유자
 *    자신의 신원(role/email)뿐**이라 정보 누출 0. 비밀번호(v=1) 세션은 신원이 없어 role/email null.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  return NextResponse.json(
    identity
      ? {
          authenticated: true,
          role: identity.role ?? null,
          email: identity.email ?? null,
        }
      : { authenticated: false, role: null, email: null },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
