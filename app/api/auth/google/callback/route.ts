/**
 * `GET /api/auth/google/callback` — Google authorize 응답 처리(BFF, Node 런타임).
 *
 * PRD user-login-auth §3.3 / AC-6~8 / AC-16 / AC-18 / AC-19:
 *   1. state 쿠키 ↔ 쿼리 `state` 일치 검증(불일치 → 400 CSRF, AC-19).
 *   2. `code` 를 Google 토큰 엔드포인트에 **서버측 교환**(client_secret) → `email_verified===true`·sub·email 추출.
 *      (교환 실패/토큰 불량 → /login?error=oauth, email 미검증 → /login?error=email_unverified, AC-18)
 *   3. `upsertProfileOnLogin` → `{ role, status }`. **스토어 오류는 500, 접근 안 열림**(fail-open 금지, AC-16).
 *   4. 분기: `approved` → 신원 세션(`signIdentitySession`) 쿠키 발급 + `next`/`/` 307(AC-7·8).
 *            `pending` → **쿠키 미발급** + `/pending` 307(AC-6).
 *
 * ⚠️ Node 런타임 — client_secret 교환. OAuth 유틸은 Edge 게이트 import 그래프에 없다(§8.4).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForIdentity,
  googleOAuthConfig,
  parseOAuthState,
} from "@/lib/server/auth/googleOAuth";
import { upsertProfileOnLogin } from "@/lib/server/auth/profileStore";
import { signIdentitySession } from "@/lib/auth/session";
import {
  buildClearedOAuthStateCookie,
  buildSessionCookie,
} from "@/lib/auth/cookie";
import { OAUTH_STATE_COOKIE_NAME } from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig();
  if (!config) {
    return redirectClearingState(request, "/login?error=oauth_disabled");
  }

  const params = request.nextUrl.searchParams;
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;
  const state = parseOAuthState(cookieState, params.get("state"));

  // CSRF — state 불일치 400(AC-19). state 쿠키는 정리.
  if (!state.valid) {
    return jsonClearingState(request, { error: "invalid_state" }, 400);
  }

  // 사용자 취소(Google `error`) 또는 code 누락 → 로그인 화면.
  const code = params.get("code");
  if (params.get("error") || !code) {
    return redirectClearingState(request, "/login?error=oauth");
  }

  // code → 검증된 신원(서버측 교환).
  const identity = await exchangeCodeForIdentity(config, code);
  if (!identity.ok) {
    const target =
      identity.reason === "email_unverified"
        ? "/login?error=email_unverified"
        : "/login?error=oauth";
    return redirectClearingState(request, target);
  }

  // 프로필 upsert — 인증은 fail-soft 아님. 스토어 오류 시 500, 접근 안 열림(AC-16).
  let outcome: Awaited<ReturnType<typeof upsertProfileOnLogin>>;
  try {
    outcome = await upsertProfileOnLogin({
      sub: identity.identity.sub,
      email: identity.identity.email,
      displayName: identity.identity.displayName,
    });
  } catch (error) {
    console.error(
      "[auth] 프로필 upsert 실패 — 로그인 거부(fail-open 금지)",
      error instanceof Error ? error.message : String(error),
    );
    return jsonClearingState(request, { error: "profile_store_error" }, 500);
  }

  // 미승인 — 쿠키 미발급, 승인 대기 화면으로(앱 데이터 노출 0, AC-6).
  if (outcome.status !== "approved") {
    return redirectClearingState(request, "/pending");
  }

  // 승인 — 신원 세션 발급(AC-7·8).
  const token = await signIdentitySession({
    sub: identity.identity.sub,
    email: identity.identity.email,
    role: outcome.role,
  });
  if (!token) {
    console.error(
      "[auth] APP_AUTH_SECRET 미설정 — 신원 세션을 발급할 수 없습니다.",
    );
    return jsonClearingState(request, { error: "server_misconfigured" }, 500);
  }

  const response = redirectClearingState(request, state.next || "/");
  const cookie = buildSessionCookie(token);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

/** 307 리다이렉트 + OAuth state 쿠키 정리(1회성). */
function redirectClearingState(
  request: NextRequest,
  target: string,
): NextResponse {
  const response = NextResponse.redirect(new URL(target, request.url), 307);
  clearState(response);
  return response;
}

/** JSON 응답 + OAuth state 쿠키 정리. */
function jsonClearingState(
  request: NextRequest,
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  const response = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  clearState(response);
  return response;
}

function clearState(response: NextResponse): void {
  const cleared = buildClearedOAuthStateCookie();
  response.cookies.set(cleared.name, cleared.value, cleared.options);
}
