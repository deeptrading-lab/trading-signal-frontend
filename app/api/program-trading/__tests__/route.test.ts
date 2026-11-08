import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

vi.mock("@/lib/server/programTrading/tossPaper", () => ({
  requireTossPaperConfig: vi.fn(),
  stepTossPaper: vi.fn(async () => false),
  tossPaperSession: vi.fn(async () => ({
    date: "2026-11-09", minute: 560, start: 1, end: 2, canStart: true, holiday: false,
  })),
}));

vi.mock("@/lib/server/programTrading/recommendationCandidates", () => ({
  loadRecommendationCandidates: vi.fn(async () => ({
    status: "ready",
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
    rows: [{ ticker: "005930", name: "삼성전자", price: 100_000, sources: ["volume"] }],
  })),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(async () => { throw Object.assign(new Error("missing"), { code: "ENOENT" }); }),
  appendFile: vi.fn(),
  rename: vi.fn(),
  writeFile: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it("starts a fresh local session without a login or database when both market feeds are ready", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T09:20:00+09:00"));
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", undefined);
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", undefined);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
  vi.stubEnv("TOSS_CLIENT_ID", "fixture");
  vi.stubEnv("TOSS_CLIENT_SECRET", "fixture");

  const origin = "http://127.0.0.1:3000";
  const url = origin + "/api/program-trading";
  const get = await GET(new NextRequest(url, { headers: { host: "127.0.0.1:3000" } }));
  expect(get.status).toBe(200);
  expect(await get.json()).toMatchObject({ running: false, candidates: { status: "ready" } });

  const start = await POST(new NextRequest(url, {
    method: "POST",
    headers: { host: "127.0.0.1:3000", origin, "content-type": "application/json" },
    body: JSON.stringify({ action: "start" }),
  }));
  expect(start.status).toBe(200);
  expect(await start.json()).toMatchObject({ running: true, lifecycle: { status: "running" }, cash: 10_000_000 });
});
