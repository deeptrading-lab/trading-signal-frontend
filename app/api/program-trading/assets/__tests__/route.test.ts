import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readProgramAccount } from "@/lib/server/programTrading/accountIdentity";
import { readProgramAssets } from "@/lib/server/programTrading/assetsStore";
import { getLocalPaperRuntime } from "@/lib/server/programTrading/localPaperRuntime";
import { GET, POST } from "../route";

vi.mock("@/lib/server/programTrading/accountIdentity", () => ({ readProgramAccount: vi.fn() }));
vi.mock("@/lib/server/programTrading/assetsStore", () => ({ readProgramAssets: vi.fn() }));
vi.mock("@/lib/server/programTrading/localPaperRuntime", () => ({ getLocalPaperRuntime: vi.fn() }));
const saveAssets = vi.fn();
const amount = { amount: 12_000_000, source: "manual" as const, updatedAt: "2026-11-26T01:00:00Z" };
const request = (body?: object, origin = "http://127.0.0.1:3000") => new NextRequest("http://127.0.0.1:3000/api/program-trading/assets", {
  method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3000", origin, "content-type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
});
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", ""); vi.stubEnv("VERCEL_ENV", undefined); vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", undefined);
  vi.mocked(readProgramAccount).mockResolvedValue("owner-a");
  vi.mocked(readProgramAssets).mockResolvedValue(amount);
  vi.mocked(getLocalPaperRuntime).mockResolvedValue({ saveAssets } as Awaited<ReturnType<typeof getLocalPaperRuntime>>);
  saveAssets.mockResolvedValue(amount);
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

it("reads only the browser identity, never a client-supplied owner", async () => {
  expect((await GET(request())).status).toBe(200);
  expect(readProgramAssets).toHaveBeenCalledExactlyOnceWith("owner-a");
  expect((await POST(request({ amount: 12_000_000, owner_sub: "other-owner" }))).status).toBe(200);
  expect(getLocalPaperRuntime).toHaveBeenCalledExactlyOnceWith("owner-a");
  expect(saveAssets).toHaveBeenCalledExactlyOnceWith(12_000_000);
});
it("rejects missing browser identity before accessing the database", async () => {
  vi.mocked(readProgramAccount).mockResolvedValue(null);
  expect((await GET(request())).status).toBe(428);
  expect((await POST(request({ amount: 100 }))).status).toBe(428);
  expect(readProgramAssets).not.toHaveBeenCalled();
  expect(getLocalPaperRuntime).not.toHaveBeenCalled();
});
it.each([-1, 1.5, "100", Number.MAX_SAFE_INTEGER + 1])("rejects invalid amount %s", async value => {
  expect((await POST(request({ amount: value }))).status).toBe(400);
  expect(saveAssets).not.toHaveBeenCalled();
});
it("rejects cross-origin manual changes", async () => {
  expect((await POST(request({ amount: 100 }, "https://elsewhere.test"))).status).toBe(403);
  expect(saveAssets).not.toHaveBeenCalled();
});
