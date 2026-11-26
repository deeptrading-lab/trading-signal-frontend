import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readProgramAssets, saveProgramAssets } from "../assetsStore";
import { PROGRAM_ASSETS_COPY as C } from "@/lib/copy/programTrading/assets";

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_fixture");
  vi.stubEnv("SUPABASE_EGRESS_DISABLED", "0");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each([{ rows: [] }, { rows: [{ amount: 0, source: "session", effective_at: "2026-11-26T06:00:00Z" }] }, { rows: [{ amount: 12_000_000, source: "manual", effective_at: "2026-11-26T06:00:00Z" }] }])("uses the default only for an absent record: %j", async ({ rows }) => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(rows)));
  vi.stubGlobal("fetch", fetch);
  const result = await readProgramAssets("google-a");
  expect(result.amount).toBe(rows[0]?.amount ?? 10_000_000);
  const url = fetch.mock.calls[0][0] as unknown as URL;
  expect(url.searchParams.get("owner_sub")).toBe("eq.google-a");
  expect(url.searchParams.get("limit")).toBe("1");
});

it("does not use the default when the database returns an error", async () => {
  vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>(async () => new Response("", { status: 503 })));
  await expect(readProgramAssets("a")).rejects.toThrow(C.database);
});

it("makes completed session writes idempotent per owner and retains their effective finish time", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  const session = { startedAt: "2026-11-26T00:00:00Z", finishedAt: "2026-11-26T06:00:00Z" };
  await saveProgramAssets("a", 12_000_000, session);
  await saveProgramAssets("a", 12_000_000, session);
  await saveProgramAssets("b", 12_000_000, session);
  const bodies = fetch.mock.calls.map(call => JSON.parse((call[1] as unknown as RequestInit).body as string));
  expect(bodies[0].id).toBe(bodies[1].id);
  expect(bodies[0].id).not.toBe(bodies[2].id);
  expect(bodies[0]).toMatchObject({ owner_sub: "a", amount: 12_000_000, effective_at: session.finishedAt, source: "session" });
});

it.each([-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid stored amounts %s", async amount => {
  await expect(saveProgramAssets("a", amount)).rejects.toThrow(C.invalid);
});
