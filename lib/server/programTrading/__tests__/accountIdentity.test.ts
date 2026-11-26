import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PROGRAM_BROWSER_COOKIE } from "@/lib/auth/programBrowser";
import { programBrowserAccount, readProgramAccount } from "../accountIdentity";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", undefined); vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", undefined);
});
afterEach(() => vi.unstubAllEnvs());
const request = (key: string, host = "localhost:3000") => new NextRequest(`http://${host}/api/program-trading`, { headers: { host, cookie: `${PROGRAM_BROWSER_COOKIE}=${key}` } });
it("uses a stable browser identity without Google login or an auth secret", async () => {
  vi.stubEnv("APP_AUTH_SECRET", undefined);
  const owner = await readProgramAccount(request("a".repeat(64)));
  expect(owner).toBe(programBrowserAccount("a".repeat(64)));
  expect(owner).toMatch(/^browser:[a-f0-9]{64}$/);
  expect(owner).not.toContain("a".repeat(64));
  expect(await readProgramAccount(request("b".repeat(64)))).not.toBe(owner);
});
it.each(["", "google-a", "a".repeat(63), "g".repeat(64)])("rejects malformed browser keys %s", async key => {
  expect(await readProgramAccount(request(key))).toBeNull();
});
it("does not accept a browser key on a deployed or non-local host", async () => {
  expect(await readProgramAccount(request("a".repeat(64), "example.com"))).toBeNull();
  vi.stubEnv("VERCEL", "1");
  expect(await readProgramAccount(request("a".repeat(64)))).toBeNull();
});
