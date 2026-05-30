/**
 * `lib/auth/session.ts` 단위 테스트.
 *
 * PRD `app-password-gate` AC-8 / AC-10 / AC-11:
 *   - 정상 토큰 round-trip(sign → verify true).
 *   - 만료 토큰(과거 exp) → false (쿠키 maxAge 와 무관, 서명 payload exp 가 단일 진실).
 *   - 변조 토큰(sig / body 위조) → false.
 *   - 시크릿 미설정 → sign null, verify false (안전 실패).
 *   - 시크릿 회전(다른 secret 으로 검증) → false.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signSession, verifySession } from "../session";
import { SESSION_MAX_AGE_SECONDS } from "../constants";

const ORIGINAL_SECRET = process.env.APP_AUTH_SECRET;

describe("lib/auth/session", () => {
  beforeEach(() => {
    process.env.APP_AUTH_SECRET = "test-secret-0123456789abcdef";
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.APP_AUTH_SECRET;
    else process.env.APP_AUTH_SECRET = ORIGINAL_SECRET;
  });

  it("정상 토큰 — sign → verify true (round-trip)", async () => {
    const now = Date.now();
    const token = await signSession(now);
    expect(token).toBeTruthy();
    expect(token).toContain(".");
    await expect(verifySession(token, now)).resolves.toBe(true);
  });

  it("[AC-8] 만료 토큰 — exp 경과 시 false (쿠키 maxAge 무관)", async () => {
    const issued = Date.now();
    const token = await signSession(issued);
    // 발급 + 30일 + 1초 → exp 경과.
    const afterExpiry = issued + (SESSION_MAX_AGE_SECONDS + 1) * 1000;
    await expect(verifySession(token, afterExpiry)).resolves.toBe(false);
  });

  it("[AC-8] 위조 토큰 — sig 변조 시 false", async () => {
    const now = Date.now();
    const token = (await signSession(now)) as string;
    const [body] = token.split(".");
    const forged = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    await expect(verifySession(forged, now)).resolves.toBe(false);
  });

  it("[AC-8] 위조 토큰 — body(payload) 변조 시 서명 불일치로 false", async () => {
    const now = Date.now();
    const token = (await signSession(now)) as string;
    const [, sig] = token.split(".");
    // payload 를 임의 base64url 로 교체 → 원 sig 와 불일치.
    const forgedBody = "eyJ2IjoxLCJpYXQiOjAsImV4cCI6OTk5OTk5OTk5OX0";
    await expect(verifySession(`${forgedBody}.${sig}`, now)).resolves.toBe(false);
  });

  it("형식 불량 토큰 — false", async () => {
    const now = Date.now();
    await expect(verifySession("", now)).resolves.toBe(false);
    await expect(verifySession(undefined, now)).resolves.toBe(false);
    await expect(verifySession("no-dot-token", now)).resolves.toBe(false);
    await expect(verifySession(".onlysig", now)).resolves.toBe(false);
    await expect(verifySession("onlybody.", now)).resolves.toBe(false);
  });

  it("시크릿 미설정 — sign null + verify false (안전 실패)", async () => {
    delete process.env.APP_AUTH_SECRET;
    const now = Date.now();
    await expect(signSession(now)).resolves.toBeNull();
    await expect(verifySession("any.thing", now)).resolves.toBe(false);
  });

  it("시크릿 회전 — 다른 secret 으로 발급된 토큰은 검증 실패 (전체 무효화)", async () => {
    const now = Date.now();
    process.env.APP_AUTH_SECRET = "secret-A";
    const token = await signSession(now);
    process.env.APP_AUTH_SECRET = "secret-B";
    await expect(verifySession(token, now)).resolves.toBe(false);
  });

  it("payload exp = iat + 30일 (만료의 단일 진실)", async () => {
    const now = Date.now();
    const token = (await signSession(now)) as string;
    const [body] = token.split(".");
    const json = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(SESSION_MAX_AGE_SECONDS);
  });
});
