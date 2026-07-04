/**
 * 세션 쿠키 옵션 빌더 — route handler 의 `Set-Cookie` 발급/삭제에 공유.
 *
 * PRD `app-password-gate` §3.3 / AC-5 / AC-7 / §6:
 *   - 발급: `httpOnly` + `secure`(프로덕션) + `sameSite=lax` + `path=/` + `maxAge=30일`.
 *   - 삭제: `maxAge=0`(과거 만료) 로 즉시 제거.
 *   - 로컬 http(localhost) 에서는 `Secure` 면 브라우저가 쿠키를 거부해 로그인 루프가 생기므로
 *     `NODE_ENV !== "production"` 일 때 `secure` 를 끈다(§6).
 *
 * `next/server` 의 `ResponseCookies.set` 이 받는 옵션 형태로 반환한다.
 */

import {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";

type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

type CookieSpec = {
  name: string;
  value: string;
  options: SessionCookieOptions;
};

/** 로컬 http 에서는 Secure 쿠키가 거부되므로 프로덕션에서만 Secure. */
function isSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

/** 세션 발급 쿠키 옵션 (maxAge 30일). */
export function buildSessionCookie(value: string): {
  name: string;
  value: string;
  options: SessionCookieOptions;
} {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: isSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}

/** 세션 삭제 쿠키 옵션 (maxAge 0 → 즉시 만료). */
export function buildClearedSessionCookie(): {
  name: string;
  value: string;
  options: SessionCookieOptions;
} {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: isSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

/**
 * OAuth state(CSRF) 쿠키 옵션 — `/api/auth/google/start` 발급.
 * `sameSite=lax` 라 Google → 콜백 top-level 리다이렉트에서 쿠키가 함께 전송된다.
 * maxAge 는 authorize 왕복 시간만(10분).
 */
export function buildOAuthStateCookie(value: string): CookieSpec {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: isSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    },
  };
}

/** OAuth state 쿠키 삭제(콜백 처리 후 1회성 정리). */
export function buildClearedOAuthStateCookie(): CookieSpec {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: isSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}
