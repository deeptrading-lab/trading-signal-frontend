import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { PROGRAM_BROWSER_COOKIE } from "../programBrowser";

const request = (path: string, key?: string) => new NextRequest(`http://localhost:3000${path}`, { headers: { host: "localhost:3000", ...(key ? { cookie: `${PROGRAM_BROWSER_COOKIE}=${key}` } : {}) } });
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", undefined); vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", undefined);
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", undefined); vi.stubEnv("APP_AUTH_SECRET", undefined);
});
afterEach(() => vi.unstubAllEnvs());
it("issues a persistent browser key even with Google login disabled and forwards it to SSR", async () => {
  const response = await proxy(request("/program-trading"));
  const cookie = response.cookies.get(PROGRAM_BROWSER_COOKIE);
  expect(cookie?.value).toMatch(/^[a-f0-9]{64}$/);
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  expect(response.headers.get("x-middleware-request-cookie")).toContain(`${PROGRAM_BROWSER_COOKIE}=${cookie!.value}`);
  expect(response.headers.get("location")).toBeNull();
});
it("keeps the same key across main, settings and review pages", async () => {
  const key = "a".repeat(64);
  for (const path of ["/program-trading", "/program-trading/assets", "/program-trading/review"]) {
    expect((await proxy(request(path, key))).cookies.get(PROGRAM_BROWSER_COOKIE)?.value).toBe(key);
  }
});
it("issues distinct keys to fresh browsers and replaces malformed keys", async () => {
  const a = (await proxy(request("/program-trading"))).cookies.get(PROGRAM_BROWSER_COOKIE)!.value;
  const b = (await proxy(request("/program-trading"))).cookies.get(PROGRAM_BROWSER_COOKIE)!.value;
  expect(a).not.toBe(b);
  expect((await proxy(request("/program-trading", "broken"))).cookies.get(PROGRAM_BROWSER_COOKIE)?.value).toMatch(/^[a-f0-9]{64}$/);
});
it("does not create identities for API calls or change deployed login behavior", async () => {
  expect((await proxy(request("/api/program-trading/assets"))).cookies.get(PROGRAM_BROWSER_COOKIE)).toBeUndefined();
  vi.stubEnv("VERCEL", "1");
  expect((await proxy(request("/program-trading"))).cookies.get(PROGRAM_BROWSER_COOKIE)).toBeUndefined();
});
