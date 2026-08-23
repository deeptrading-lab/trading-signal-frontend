/**
 * `GET /api/auth/me` — 현재 세션 신원(role·email) 반환 (BFF).
 *
 * user-login-auth Phase 2 — 클라이언트가 **role-aware UI**(관리자 전용 표시 등)를 그리도록
 * 현재 사용자의 role/email 을 노출한다. 세션 쿠키(`app_auth`)를 `readSession`(HMAC 서명검증)으로
 * 읽어 반환하며, 위조·만료·미인증·시크릿 미설정은 `authenticated:false`.
 *
 * live-role-check — `role` 은 **쿠키가 아니라 DB** 를 본다. 쿠키에 구워진 role 은 강등을 반영하지
 *   못해, 강등된 관리자에게 관리자 메뉴가 계속 보이는 UI 불일치가 생긴다(API 는 이미 403).
 *   조회 실패·승인취소·삭제된 유저는 `role: null` 로 떨어뜨려 권한 UI 를 닫되 `authenticated` 는
 *   유지한다 — 일시적 DB 장애로 로그인 자체가 풀리지 않게. 잔여 열람 권한은 쿠키 수명(7일)까지다.
 *
 * ⚠️ `/api/auth/*` 공개경로(게이트 예외)라 미인증에서도 호출 가능 — 반환 데이터는 **쿠키 소유자
 *    자신의 신원(role/email)뿐**이라 정보 누출 0. 비밀번호(v=1) 세션은 신원이 없어 role/email null.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { resolveLiveIdentity } from "@/lib/server/auth/liveRole";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  // 승인 상태가 approved 일 때만 등급을 노출한다 — pending(승인취소)은 권한 UI 를 닫는다.
  const live = await resolveLiveIdentity(identity);
  const role = live && live.status === "approved" ? live.role : null;
  return NextResponse.json(
    identity
      ? {
          authenticated: true,
          role,
          email: live?.email ?? identity.email ?? null,
        }
      : { authenticated: false, role: null, email: null },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
