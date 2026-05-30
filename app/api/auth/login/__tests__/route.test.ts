/**
 * `app/api/auth/login/route.ts` 단위 테스트.
 *
 * PRD `app-password-gate` AC-5 / AC-19:
 *   - 정답 → 200 + Set-Cookie(app_auth, HttpOnly, SameSite=Lax, Path=/, Max-Age=30일).
 *   - 오답 → ~500ms 지연 후 401, 응답 본문에 비밀번호 값 미포함.
 *   - 비밀번호 미설정(게이트 비활성) → 409 gate_disabled.
 *   - 시크릿 미설정 → 500(토큰 발급 거부, 한 쌍 가드).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";

const ORIGINAL_PASSWORD = process.env.APP_PASSWORD;
const ORIGINAL_SECRET = process.env.APP_AUTH_SECRET;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = "super-secret-password-123";
    process.env.APP_AUTH_SECRET = "auth-secret-xyz-0123456789";
  });

  afterEach(() => {
    if (ORIGINAL_PASSWORD === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = ORIGINAL_PASSWORD;
    if (ORIGINAL_SECRET === undefined) delete process.env.APP_AUTH_SECRET;
    else process.env.APP_AUTH_SECRET = ORIGINAL_SECRET;
    vi.restoreAllMocks();
  });

  it("[AC-5] 정답 → 200 + Set-Cookie(app_auth, HttpOnly, SameSite=Lax, Path=/, Max-Age=30일)", async () => {
    const res = await POST(makeRequest({ password: "super-secret-password-123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("app_auth=");
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    // 발급된 토큰 값(app_auth 쿠키 본문)은 점 구분 형식.
    const value = res.cookies.get("app_auth")?.value ?? "";
    expect(value).toContain(".");
  });

  it("[AC-5] 정답 + 비프로덕션 → Secure 미포함 (로컬 http 쿠키 거부 회피)", async () => {
    // 테스트 환경 NODE_ENV 는 test/development → secure false.
    const res = await POST(makeRequest({ password: "super-secret-password-123" }));
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toMatch(/;\s*Secure/i);
  });

  it("[AC-19] 오답 → ~500ms 지연 후 401, 본문에 비밀번호 값 미포함", async () => {
    const start = Date.now();
    const res = await POST(makeRequest({ password: "wrong-password" }));
    const elapsed = Date.now() - start;
    expect(res.status).toBe(401);
    expect(elapsed).toBeGreaterThanOrEqual(450); // ~500ms 고정 지연.
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_password" });
    // 정답 비밀번호 평문이 응답 어디에도 없다.
    expect(JSON.stringify(body)).not.toContain("super-secret-password-123");
  });

  it("body 누락/형식 불량 → 401 (지연 포함)", async () => {
    const res = await POST(makeRequest({ notPassword: 1 }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_password" });
  });

  it("[게이트 비활성] APP_PASSWORD 미설정 → 409 gate_disabled", async () => {
    delete process.env.APP_PASSWORD;
    const res = await POST(makeRequest({ password: "anything" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ error: "gate_disabled" });
  });

  it("[한 쌍 가드] APP_AUTH_SECRET 미설정 → 500 (토큰 발급 거부)", async () => {
    delete process.env.APP_AUTH_SECRET;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({ password: "super-secret-password-123" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "server_misconfigured" });
    // 로그에 비밀번호 평문 미노출.
    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).not.toContain("super-secret-password-123");
  });
});
