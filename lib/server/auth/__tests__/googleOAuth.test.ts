/**
 * `lib/server/auth/googleOAuth.ts` 단위 테스트 (PRD user-login-auth §3.3 / AC-18·19).
 *
 *   - buildAuthorizeUrl: scope/prompt/redirect_uri/state 파라미터.
 *   - createOAuthState ↔ parseOAuthState round-trip + nonce 불일치/오염 next 방어.
 *   - exchangeCodeForIdentity: email_verified true 만 신원 반환, false/실패 사유 분기.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  createOAuthState,
  exchangeCodeForIdentity,
  googleOAuthConfig,
  isGoogleOAuthConfigured,
  parseOAuthState,
  sanitizeNextPath,
} from "@/lib/server/auth/googleOAuth";

const CONFIG = {
  clientId: "client-123.apps.googleusercontent.com",
  clientSecret: "secret-xyz",
  redirectUri: "http://localhost:3000/api/auth/google/callback",
};

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

/** base64url(JSON) id_token payload 세그먼트 — 서명은 검증 안 하므로 sig 는 아무 값. */
function makeIdToken(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `header.${payload}.sig`;
}

describe("googleOAuthConfig / isGoogleOAuthConfigured", () => {
  it("env 3종 모두 있어야 config, 하나라도 없으면 null", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    expect(googleOAuthConfig()).toBeNull();
    expect(isGoogleOAuthConfigured()).toBe(false);

    process.env.GOOGLE_OAUTH_CLIENT_ID = CONFIG.clientId;
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = CONFIG.clientSecret;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = CONFIG.redirectUri;
    expect(isGoogleOAuthConfigured()).toBe(true);
  });
});

describe("buildAuthorizeUrl", () => {
  it("scope=openid email profile · prompt=select_account · redirect_uri · state 를 담는다", () => {
    const url = new URL(buildAuthorizeUrl(CONFIG, "nonce-abc"));
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe(CONFIG.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(CONFIG.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(url.searchParams.get("state")).toBe("nonce-abc");
    expect(url.searchParams.get("access_type")).toBe("online");
  });
});

describe("state 생성/대조", () => {
  it("round-trip — 일치 nonce + next 보존", () => {
    const { urlState, cookieValue } = createOAuthState("/dashboard?tab=x");
    const parsed = parseOAuthState(cookieValue, urlState);
    expect(parsed.valid).toBe(true);
    expect(parsed.next).toBe("/dashboard?tab=x");
  });

  it("[AC-19] nonce 불일치 → invalid", () => {
    const { cookieValue } = createOAuthState("/");
    expect(parseOAuthState(cookieValue, "wrong-nonce").valid).toBe(false);
    expect(parseOAuthState(undefined, "x").valid).toBe(false);
    expect(parseOAuthState(cookieValue, null).valid).toBe(false);
  });

  it("오염된 next(open-redirect) → '/' 로 정규화", () => {
    const evil = createOAuthState("//evil.com");
    expect(parseOAuthState(evil.cookieValue, evil.urlState).next).toBe("/");
    const abs = createOAuthState("https://evil.com");
    expect(parseOAuthState(abs.cookieValue, abs.urlState).next).toBe("/");
  });
});

describe("sanitizeNextPath", () => {
  it("same-origin 절대경로만 허용, 그 외 '/'", () => {
    expect(sanitizeNextPath("/stock/AAPL")).toBe("/stock/AAPL");
    expect(sanitizeNextPath("//evil")).toBe("/");
    expect(sanitizeNextPath("https://evil.com")).toBe("/");
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath(undefined)).toBe("/");
    expect(sanitizeNextPath("")).toBe("/");
  });
});

describe("exchangeCodeForIdentity", () => {
  it("[AC-18] email_verified=true → 신원 반환(email 소문자화)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id_token: makeIdToken({
            sub: "google-sub-1",
            email: "User@Example.COM",
            email_verified: true,
            name: "홍길동",
            aud: CONFIG.clientId,
          }),
        }),
        text: async () => "",
      }),
    );

    const result = await exchangeCodeForIdentity(CONFIG, "code-abc");
    expect(result).toEqual({
      ok: true,
      identity: {
        sub: "google-sub-1",
        email: "user@example.com",
        displayName: "홍길동",
      },
    });
  });

  it("[AC-18] email_verified=false → email_unverified", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id_token: makeIdToken({
            sub: "s",
            email: "user@example.com",
            email_verified: false,
            aud: CONFIG.clientId,
          }),
        }),
        text: async () => "",
      }),
    );
    const result = await exchangeCodeForIdentity(CONFIG, "code");
    expect(result).toEqual({ ok: false, reason: "email_unverified" });
  });

  it("aud 불일치(토큰 오배송) → invalid_token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id_token: makeIdToken({
            sub: "s",
            email: "user@example.com",
            email_verified: true,
            aud: "someone-else",
          }),
        }),
        text: async () => "",
      }),
    );
    const result = await exchangeCodeForIdentity(CONFIG, "code");
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("토큰 엔드포인트 non-ok → exchange_failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
        text: async () => "invalid_grant",
      }),
    );
    const result = await exchangeCodeForIdentity(CONFIG, "bad-code");
    expect(result).toEqual({ ok: false, reason: "exchange_failed" });
  });

  it("네트워크 예외 → exchange_failed(throw 안 함)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const result = await exchangeCodeForIdentity(CONFIG, "code");
    expect(result).toEqual({ ok: false, reason: "exchange_failed" });
    warnSpy.mockRestore();
  });
});
