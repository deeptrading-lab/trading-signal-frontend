/**
 * 루트 `proxy.ts` 단위 테스트 (Next 16 — 구 middleware 컨벤션 리네임).
 *
 * PRD `app-password-gate` AC-1~4 / AC-13:
 *   - 게이트 비활성(APP_PASSWORD 미설정) → 전부 통과.
 *   - 쿠키 없음 + 페이지 → /login?next=<원경로> 307 리다이렉트(open-redirect 차단).
 *   - 쿠키 없음 + /api/* → 401 JSON(리다이렉트 X).
 *   - 예외 경로(/login, /api/auth/*, /icon, /fonts/*, /_next/*) → 401·리다이렉트 안 됨(루프 가드).
 *   - 유효 쿠키 → 통과.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "../proxy";
import { signSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const ORIGINAL_PASSWORD = process.env.APP_PASSWORD;
const ORIGINAL_SECRET = process.env.APP_AUTH_SECRET;

function makeRequest(
  path: string,
  options?: { cookie?: string },
): NextRequest {
  const headers = new Headers();
  if (options?.cookie) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${options.cookie}`);
  }
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("proxy (app password gate)", () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = "gate-password";
    process.env.APP_AUTH_SECRET = "gate-secret-0123456789abcdef";
  });

  afterEach(() => {
    if (ORIGINAL_PASSWORD === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = ORIGINAL_PASSWORD;
    if (ORIGINAL_SECRET === undefined) delete process.env.APP_AUTH_SECRET;
    else process.env.APP_AUTH_SECRET = ORIGINAL_SECRET;
  });

  describe("[AC-13] 게이트 비활성 (APP_PASSWORD 미설정)", () => {
    it("쿠키 없이도 페이지/API 전부 통과", async () => {
      delete process.env.APP_PASSWORD;
      const page = await proxy(makeRequest("/dashboard"));
      const api = await proxy(makeRequest("/api/market/ticker"));
      // NextResponse.next() — 리다이렉트(3xx) 도 401 도 아님.
      expect(page.status).toBe(200);
      expect(api.status).toBe(200);
      expect(page.headers.get("location")).toBeNull();
    });
  });

  describe("[AC-2] 미인증 페이지 → /login?next=<원경로> 307", () => {
    it("쿠키 없음 + /dashboard → /login?next=/dashboard 307", async () => {
      const res = await proxy(makeRequest("/dashboard"));
      expect(res.status).toBe(307);
      const location = res.headers.get("location") ?? "";
      expect(location).toContain("/login");
      const url = new URL(location, "http://localhost");
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("next")).toBe("/dashboard");
    });

    it("쿼리 포함 원경로 보존 — /profile/AAPL?tab=x", async () => {
      const res = await proxy(makeRequest("/profile/AAPL?tab=x"));
      const location = res.headers.get("location") ?? "";
      const url = new URL(location, "http://localhost");
      expect(url.searchParams.get("next")).toBe("/profile/AAPL?tab=x");
    });
  });

  describe("[AC-3] 미인증 /api/* → 401 JSON (리다이렉트 X)", () => {
    it("쿠키 없음 + /api/market/ticker → 401 unauthorized", async () => {
      const res = await proxy(makeRequest("/api/market/ticker"));
      expect(res.status).toBe(401);
      expect(res.headers.get("location")).toBeNull();
      const body = await res.json();
      expect(body).toEqual({ error: "unauthorized" });
    });

    it("쿠키 없음 + /api/workbench/analyze → 401", async () => {
      const res = await proxy(makeRequest("/api/workbench/analyze"));
      expect(res.status).toBe(401);
    });
  });

  describe("[AC-4] 예외 경로 — 항상 통과 (루프 가드)", () => {
    it.each([
      ["/login"],
      ["/api/auth/login"],
      ["/api/auth/logout"],
      ["/icon"],
      ["/favicon.ico"],
      ["/fonts/pretendard/Pretendard-Bold.subset.woff2"],
    ])("%s 는 쿠키 없이도 통과(401·리다이렉트 X)", async (path) => {
      const res = await proxy(makeRequest(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    // `/_next/static`·`/_next/image` 는 matcher 단계에서 제외 → 미들웨어 함수 자체가 실행되지
    // 않는다(성능, 빌드 자산). 따라서 함수 직접 호출이 아니라 matcher 설정으로 공개를 보장한다.
    it("[matcher] _next/static·_next/image 는 matcher 에서 제외(함수 미실행)", () => {
      const m = Array.isArray(config.matcher) ? config.matcher[0] : config.matcher;
      expect(m).toContain("_next/static");
      expect(m).toContain("_next/image");
    });

    it("[루프 가드] 미인증 + /login → 다시 /login 리다이렉트하지 않음", async () => {
      const res = await proxy(makeRequest("/login?next=/dashboard"));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  describe("[AC-6] 유효 쿠키 → 통과", () => {
    it("유효 세션 쿠키 + /dashboard → 통과", async () => {
      const token = (await signSession()) as string;
      const res = await proxy(makeRequest("/dashboard", { cookie: token }));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("유효 세션 쿠키 + /api/market/ticker → 통과(401 아님)", async () => {
      const token = (await signSession()) as string;
      const res = await proxy(
        makeRequest("/api/market/ticker", { cookie: token }),
      );
      expect(res.status).toBe(200);
    });

    it("변조 쿠키 + /dashboard → 미인증 취급(리다이렉트)", async () => {
      const res = await proxy(
        makeRequest("/dashboard", { cookie: "forged.token" }),
      );
      expect(res.status).toBe(307);
    });
  });
});
