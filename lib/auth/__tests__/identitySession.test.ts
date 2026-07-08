/**
 * `lib/auth/session.ts` 신원 확장 단위 테스트 (PRD user-login-auth §3.2 / AC-5·11·18).
 *
 *   - `signIdentitySession` round-trip: verifySession true + readSession 이 sub/email/role 반환.
 *   - `v=1`(비밀번호) 세션: 비밀번호 로그인 폐지 후 **거부**(verifySession false, readSession null → 재로그인 강제).
 *   - 위조/만료 신원 토큰: readSession null(위조 role=admin 통과 차단).
 *   - 시크릿 미설정: sign null + readSession null(안전 실패).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readSession,
  signIdentitySession,
  signSession,
  verifySession,
} from "../session";
import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_TOKEN_VERSION_IDENTITY,
} from "../constants";

const ORIGINAL_SECRET = process.env.APP_AUTH_SECRET;

describe("lib/auth/session — 신원 확장", () => {
  beforeEach(() => {
    process.env.APP_AUTH_SECRET = "identity-secret-0123456789abcdef";
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.APP_AUTH_SECRET;
    else process.env.APP_AUTH_SECRET = ORIGINAL_SECRET;
  });

  it("signIdentitySession → verifySession true + readSession 이 신원 반환", async () => {
    const now = Date.now();
    const token = (await signIdentitySession(
      { sub: "google-sub-123", email: "user@example.com", role: "admin" },
      now,
    )) as string;

    expect(token).toContain(".");
    await expect(verifySession(token, now)).resolves.toBe(true);

    const identity = await readSession(token, now);
    expect(identity).toEqual({
      v: SESSION_TOKEN_VERSION_IDENTITY,
      sub: "google-sub-123",
      email: "user@example.com",
      role: "admin",
    });
  });

  it("v=1 비밀번호 세션 — 폐지 후 거부(verifySession false, readSession null → 재로그인 강제)", async () => {
    const now = Date.now();
    const legacy = (await signSession(now)) as string;
    expect(legacy).toContain(".");

    // 비밀번호 로그인 폐지 — 남아 있던 v=1 쿠키는 서명이 유효해도 게이트·신원 양쪽에서 거부.
    await expect(verifySession(legacy, now)).resolves.toBe(false);
    await expect(readSession(legacy, now)).resolves.toBeNull();
  });

  it("[AC-11] 위조 신원 토큰 — readSession null(위조 role=admin 통과 차단)", async () => {
    const now = Date.now();
    const token = (await signIdentitySession(
      { sub: "s", email: "e@example.com", role: "user" },
      now,
    )) as string;
    const [body] = token.split(".");
    // sig 를 위조 → 서명 불일치.
    const forged = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    await expect(readSession(forged, now)).resolves.toBeNull();
    await expect(verifySession(forged, now)).resolves.toBe(false);
  });

  it("만료 신원 토큰 — readSession null(exp 단일 진실)", async () => {
    const issued = Date.now();
    const token = (await signIdentitySession(
      { sub: "s", email: "e@example.com", role: "admin" },
      issued,
    )) as string;
    const afterExpiry = issued + (SESSION_MAX_AGE_SECONDS + 1) * 1000;
    await expect(readSession(token, afterExpiry)).resolves.toBeNull();
  });

  it("시크릿 미설정 — signIdentitySession null + readSession null(안전 실패)", async () => {
    delete process.env.APP_AUTH_SECRET;
    const now = Date.now();
    await expect(
      signIdentitySession({ sub: "s", email: "e@example.com", role: "user" }, now),
    ).resolves.toBeNull();
    await expect(readSession("any.thing", now)).resolves.toBeNull();
  });

  it("신원 토큰 payload — v=2, exp = iat + 30일", async () => {
    const now = Date.now();
    const token = (await signIdentitySession(
      { sub: "s", email: "e@example.com", role: "user" },
      now,
    )) as string;
    const [body] = token.split(".");
    const json = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { v: number; iat: number; exp: number };
    expect(payload.v).toBe(SESSION_TOKEN_VERSION_IDENTITY);
    expect(payload.exp - payload.iat).toBe(SESSION_MAX_AGE_SECONDS);
  });
});
