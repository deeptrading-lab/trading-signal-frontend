/**
 * `GET /api/auth/google/start` — Google authorize URL 로 리다이렉트(BFF, Node 런타임).
 *
 * PRD user-login-auth §3.3:
 *   - scope `openid email profile`(online only), `prompt=select_account`, redirect_uri = env 고정.
 *   - state(CSRF) 를 httpOnly 쿠키로 발급 + authorize URL 에 동봉. `next`(same-origin 검증) 를
 *     state 쿠키에 함께 실어 콜백까지 전달.
 *   - 로그인 화면의 "Google로 계속하기" 버튼이 `<a href>` 로 진입(클라이언트 fetch 0, AC-21).
 *
 * ⚠️ Node 런타임 — `googleOAuth` 유틸(client_secret 교환 그래프)은 Edge 게이트에 넣지 않는다(§8.4).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  createOAuthState,
  googleOAuthConfig,
  sanitizeNextPath,
} from "@/lib/server/auth/googleOAuth";
import { buildOAuthStateCookie } from "@/lib/auth/cookie";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = googleOAuthConfig();
  if (!config) {
    // OAuth 미구성 — 로그인 화면으로(비밀번호 폴백 등 안내는 /login 이 담당).
    return NextResponse.redirect(
      new URL("/login?error=oauth_disabled", request.url),
      307,
    );
  }

  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const state = createOAuthState(next);
  const authorizeUrl = buildAuthorizeUrl(config, state.urlState);

  const response = NextResponse.redirect(authorizeUrl, 307);
  const cookie = buildOAuthStateCookie(state.cookieValue);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
