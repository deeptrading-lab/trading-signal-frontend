/**
 * `app/api/auth/google/callback/route.ts` 단위 테스트 (PRD user-login-auth AC-6·7·8·16·18·19).
 *
 * 분기 매트릭스:
 *   - state 불일치 → 400(CSRF, AC-19).
 *   - code 누락/OAuth error → /login?error=oauth 307.
 *   - email 미검증 → /login?error=email_unverified 307(AC-18).
 *   - pending → /pending 307, app_auth **미발급**(AC-6).
 *   - approved → next 307 + 신원 app_auth 발급(AC-7·8), role=admin 이면 세션에 admin.
 *   - 스토어 오류(upsert throw) → 500, app_auth 미발급(fail-open 금지, AC-16).
 *
 * googleOAuth 의 code 교환·profileStore 의 upsert 는 mock, state 유틸·세션 서명은 실제.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import {
  createOAuthState,
  exchangeCodeForIdentity,
} from "@/lib/server/auth/googleOAuth";
import { upsertProfileOnLogin } from "@/lib/server/auth/profileStore";
import { readSession } from "@/lib/auth/session";
import { OAUTH_STATE_COOKIE_NAME } from "@/lib/auth/constants";

vi.mock("@/lib/server/auth/googleOAuth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/auth/googleOAuth")>();
  return { ...actual, exchangeCodeForIdentity: vi.fn() };
});
vi.mock("@/lib/server/auth/profileStore", () => ({
  upsertProfileOnLogin: vi.fn(),
}));

const mockExchange = vi.mocked(exchangeCodeForIdentity);
const mockUpsert = vi.mocked(upsertProfileOnLogin);

const ORIGINAL_ENV = { ...process.env };

const IDENTITY = {
  ok: true as const,
  identity: {
    sub: "google-sub-1",
    email: "user@example.com",
    displayName: "홍길동",
  },
};

beforeEach(() => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "client-123";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret-xyz";
  process.env.GOOGLE_OAUTH_REDIRECT_URI =
    "http://localhost:3000/api/auth/google/callback";
  process.env.APP_AUTH_SECRET = "callback-secret-0123456789abcdef";
});

afterEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

/** 콜백 요청 생성 — 쿼리(code/state/error) + oauth_state 쿠키. */
function makeCallback(options: {
  code?: string;
  urlState?: string;
  cookieValue?: string;
  error?: string;
}): NextRequest {
  const url = new URL("http://localhost:3000/api/auth/google/callback");
  if (options.code) url.searchParams.set("code", options.code);
  if (options.urlState) url.searchParams.set("state", options.urlState);
  if (options.error) url.searchParams.set("error", options.error);

  const headers = new Headers();
  if (options.cookieValue) {
    headers.set("cookie", `${OAUTH_STATE_COOKIE_NAME}=${options.cookieValue}`);
  }
  return new NextRequest(url, { headers });
}

describe("GET /api/auth/google/callback", () => {
  it("[AC-19] state 불일치 → 400", async () => {
    const { cookieValue } = createOAuthState("/dashboard");
    const res = await GET(
      makeCallback({ code: "c", urlState: "wrong-nonce", cookieValue }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_state" });
    expect(res.cookies.get("app_auth")).toBeUndefined();
  });

  it("code 누락 → /login?error=oauth 307", async () => {
    const { urlState, cookieValue } = createOAuthState("/");
    const res = await GET(makeCallback({ urlState, cookieValue }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=oauth");
  });

  it("[AC-18] email 미검증 → /login?error=email_unverified, app_auth 미발급", async () => {
    mockExchange.mockResolvedValue({ ok: false, reason: "email_unverified" });
    const { urlState, cookieValue } = createOAuthState("/");
    const res = await GET(makeCallback({ code: "c", urlState, cookieValue }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=email_unverified");
    expect(res.cookies.get("app_auth")).toBeUndefined();
  });

  it("[AC-6] pending → /pending 307, app_auth 미발급", async () => {
    mockExchange.mockResolvedValue(IDENTITY);
    mockUpsert.mockResolvedValue({ role: "user", status: "pending" });
    const { urlState, cookieValue } = createOAuthState("/dashboard");
    const res = await GET(makeCallback({ code: "c", urlState, cookieValue }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/pending");
    expect(res.cookies.get("app_auth")).toBeUndefined();
  });

  it("[AC-8] approved user → next 307 + 신원 app_auth 발급", async () => {
    mockExchange.mockResolvedValue(IDENTITY);
    mockUpsert.mockResolvedValue({ role: "user", status: "approved" });
    const { urlState, cookieValue } = createOAuthState("/dashboard?tab=x");
    const res = await GET(makeCallback({ code: "c", urlState, cookieValue }));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard?tab=x");

    const token = res.cookies.get("app_auth")?.value ?? "";
    expect(token).toContain(".");
    const identity = await readSession(token);
    expect(identity?.sub).toBe("google-sub-1");
    expect(identity?.email).toBe("user@example.com");
    expect(identity?.role).toBe("user");
  });

  it("[AC-7] approved admin → 세션 role=admin", async () => {
    mockExchange.mockResolvedValue(IDENTITY);
    mockUpsert.mockResolvedValue({ role: "admin", status: "approved" });
    const { urlState, cookieValue } = createOAuthState("/");
    const res = await GET(makeCallback({ code: "c", urlState, cookieValue }));

    const token = res.cookies.get("app_auth")?.value ?? "";
    const identity = await readSession(token);
    expect(identity?.role).toBe("admin");
    // next 없으면 "/" 로.
    expect(res.headers.get("location")).toMatch(/\/$/);
  });

  it("[AC-16] 스토어 오류(upsert throw) → 500, app_auth 미발급(fail-open 금지)", async () => {
    mockExchange.mockResolvedValue(IDENTITY);
    mockUpsert.mockRejectedValue(new Error("supabase down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { urlState, cookieValue } = createOAuthState("/");
    const res = await GET(makeCallback({ code: "c", urlState, cookieValue }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "profile_store_error" });
    expect(res.cookies.get("app_auth")).toBeUndefined();
    errorSpy.mockRestore();
  });
});
