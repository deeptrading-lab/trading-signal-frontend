/**
 * `POST /api/auth/login` — 공유 비밀번호 검증 + 세션 쿠키 발급.
 *
 * PRD `app-password-gate` §3.3 / AC-5 / AC-19:
 *   - body `{ password }`. `process.env.APP_PASSWORD` 와 **constant-time 비교**(타이밍 공격 방지).
 *   - 일치 → `signSession()` 토큰을 `app_auth` 쿠키로 발급
 *     (httpOnly + secure(prod) + sameSite=lax + path=/ + maxAge=30일). `{ ok: true }`.
 *   - 불일치 → **~500ms 고정 지연** 후 401 `{ error: "invalid_password" }`.
 *     비밀번호 값/힌트를 응답·로그에 절대 노출하지 않는다. in-memory 카운터/잠금 없음(§4).
 *   - `APP_PASSWORD` 미설정(게이트 비활성) → 409 `{ error: "gate_disabled" }`(로그인 불필요 안내).
 *   - 본 route 는 middleware 의 `/api/auth/*` 예외라 미인증 상태에서 호출 가능.
 *
 * 런타임: 기본 Node(서명 유틸은 Edge 호환이라 middleware 와 공유). 로깅 0(비밀번호/토큰 미출력).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { buildSessionCookie } from "@/lib/auth/cookie";

/** 오답 응답 전 고정 지연 — 온라인 브루트포스 완화(AC-19). */
const FAILURE_DELAY_MS = 500;

export async function POST(request: NextRequest) {
  // 게이트 비활성(비밀번호 미설정) → 로그인 자체가 무의미.
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json(
      { error: "gate_disabled" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  const password = await readPassword(request);

  // 입력 누락·정답 불일치 → 고정 지연 후 401(비밀번호 값 노출 0).
  if (password === null || !verifyPassword(password)) {
    await delay(FAILURE_DELAY_MS);
    return NextResponse.json(
      { error: "invalid_password" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = await signSession();
  if (!token) {
    // APP_PASSWORD 는 있는데 APP_AUTH_SECRET 이 빠진 구성 — 한 쌍이어야 한다.
    console.error(
      "[auth] APP_AUTH_SECRET 미설정 — 세션 토큰을 발급할 수 없습니다. APP_PASSWORD 와 한 쌍으로 설정하세요.",
    );
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  const cookie = buildSessionCookie(token);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

/** body 에서 password 문자열을 안전하게 추출. 형식 불량이면 null. */
async function readPassword(request: NextRequest): Promise<string | null> {
  try {
    const body = (await request.json()) as unknown;
    if (
      body &&
      typeof body === "object" &&
      typeof (body as { password?: unknown }).password === "string"
    ) {
      return (body as { password: string }).password;
    }
    return null;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
