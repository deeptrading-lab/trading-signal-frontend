/**
 * `POST /api/auth/logout` — 세션 쿠키 삭제.
 *
 * PRD `app-password-gate` §3.3 / AC-7:
 *   - 세션 쿠키를 `Max-Age=0`(과거 만료) 로 즉시 제거. `{ ok: true }`.
 *   - 이후 보호 경로 접근 시 middleware 가 다시 `/login` 으로 보낸다(리다이렉트는 클라가 수행).
 *   - 본 route 는 middleware 의 `/api/auth/*` 예외라 항상 통과.
 */

import { NextResponse } from "next/server";
import { buildClearedSessionCookie } from "@/lib/auth/cookie";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  const cookie = buildClearedSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
