/**
 * `lib/auth/password.ts` 단위 테스트.
 *
 * PRD `app-password-gate` AC-11 / AC-19:
 *   - 정답 비밀번호 → true, 오답 → false.
 *   - 길이가 다른 입력도 안전하게 false(constant-time 경로 — early-return 없음).
 *   - `APP_PASSWORD` 미설정 → 항상 false(게이트 비활성 시 로그인 무의미).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyPassword } from "../password";

const ORIGINAL = process.env.APP_PASSWORD;

describe("lib/auth/password", () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = "correct-horse-battery-staple";
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = ORIGINAL;
  });

  it("정답 비밀번호 → true", () => {
    expect(verifyPassword("correct-horse-battery-staple")).toBe(true);
  });

  it("오답(같은 길이) → false", () => {
    expect(verifyPassword("correct-horse-battery-staplX")).toBe(false);
  });

  it("오답(짧은 길이) → false", () => {
    expect(verifyPassword("wrong")).toBe(false);
  });

  it("오답(긴 길이) → false", () => {
    expect(verifyPassword("correct-horse-battery-staple-extra")).toBe(false);
  });

  it("빈 문자열 → false", () => {
    expect(verifyPassword("")).toBe(false);
  });

  it("APP_PASSWORD 미설정 → 항상 false", () => {
    delete process.env.APP_PASSWORD;
    expect(verifyPassword("anything")).toBe(false);
    expect(verifyPassword("")).toBe(false);
  });
});
