import { NextRequest } from "next/server";
import { rename, writeFile } from "node:fs/promises";
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
  readdir: vi.fn(async () => []),
  readFile: vi.fn(async () => { throw Object.assign(new Error("missing"), { code: "ENOENT" }); }),
  appendFile: vi.fn(),
  rename: vi.fn(),
  writeFile: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it("archives a completed local session and opens a fresh session ready to start again", async () => {
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
  const send = (action: string) => POST(new NextRequest(url, {
    method: "POST",
    headers: { host: "127.0.0.1:3000", origin, "content-type": "application/json" },
    body: JSON.stringify({ action }),
  }));
  const get = await GET(new NextRequest(url, { headers: { host: "127.0.0.1:3000" } }));
  expect(get.status).toBe(200);
  expect(await get.json()).toMatchObject({ running: false, candidates: { status: "ready" } });

  const start = await send("start");
  expect(start.status).toBe(200);
  expect(await start.json()).toMatchObject({ running: true, lifecycle: { status: "running" }, cash: 10_000_000 });

  expect((await send("new-session")).status).toBe(409);
  const active = await GET(new NextRequest(url, { headers: { host: "127.0.0.1:3000" } }));
  expect(await active.json()).toMatchObject({ running: true });

  const stop = await send("flatten");
  expect(await stop.json()).toMatchObject({ running: false, lifecycle: { status: "completed" } });

  const fresh = await send("new-session");
  expect(fresh.status).toBe(200);
  const freshState = await fresh.json();
  expect(freshState).toMatchObject({ running: false, cash: 10_000_000, positions: [], trades: [] });
  expect(freshState.lifecycle).toBeUndefined();
  expect(writeFile).toHaveBeenCalledWith(expect.stringMatching(/toss-paper\/review\.json\.tmp$/), expect.stringContaining('"audit"'), { mode: 0o600 });
  const archiveMoves = vi.mocked(rename).mock.calls.filter(([from]) => from === ".local/program-trading/toss-paper");
  expect(archiveMoves).toEqual([[".local/program-trading/toss-paper", expect.stringMatching(/^\.local\/program-trading\/toss-paper-archive\//)]]);

  expect((await send("new-session")).status).toBe(409);
  const restart = await send("start");
  expect(restart.status).toBe(200);
  expect(await restart.json()).toMatchObject({ running: true, lifecycle: { status: "running" }, cash: 10_000_000 });
});
