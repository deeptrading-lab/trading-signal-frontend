import { readFile, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getLocalPaperRuntime } from "../localPaperRuntime";
import { readProgramAssets, saveProgramAssets } from "../assetsStore";
import { emptyPaperCandidates } from "../tossPaper";
import { PROGRAM_ASSETS_COPY as C } from "@/lib/copy/programTrading/assets";
import { initialState } from "../engine";

vi.mock("node:fs/promises", () => ({ mkdir: vi.fn(), readdir: vi.fn(async () => []), readFile: vi.fn(), appendFile: vi.fn(), rename: vi.fn(), writeFile: vi.fn() }));
vi.mock("../assetsStore", () => ({ readProgramAssets: vi.fn(), saveProgramAssets: vi.fn() }));
vi.mock("../tossPaper", async original => ({ ...await original<typeof import("../tossPaper")>(), requireTossPaperConfig: vi.fn(), fetchPaperCandidates: vi.fn(async () => emptyPaperCandidates()), fetchPaperPrices: vi.fn(async () => new Map()) }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-26T10:00:00+09:00"));
  vi.mocked(readFile).mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
  vi.mocked(readProgramAssets).mockResolvedValue({ amount: 10_000_000, source: "default", updatedAt: null });
  vi.mocked(saveProgramAssets).mockResolvedValue(undefined);
});
afterEach(() => {
  Reflect.deleteProperty(globalThis, "localAccountPaperRuntimes");
  vi.clearAllTimers(); vi.useRealTimers(); vi.resetAllMocks();
});

it("loads each browser's balance and isolates runtime and journal paths", async () => {
  vi.mocked(readProgramAssets).mockImplementation(async owner => ({ amount: owner === "a" ? 12_000_000 : 10_000_000, source: "manual", updatedAt: null }));
  const a = await getLocalPaperRuntime("a");
  const b = await getLocalPaperRuntime("b");
  await a.run("start"); await b.run("start");
  expect((await a.snapshot()).cash).toBe(12_000_000);
  expect((await b.snapshot()).cash).toBe(10_000_000);
  expect(a).not.toBe(b);
  const paths = new Set(vi.mocked(writeFile).mock.calls.map(([path]) => String(path)).filter(path => path.endsWith("state.tmp")));
  expect(paths.size).toBe(2);
});

it("keeps the session baseline when pausing and resuming", async () => {
  const paper = await getLocalPaperRuntime("a");
  await paper.run("start"); await paper.run("pause"); await paper.run("start");
  expect(readProgramAssets).toHaveBeenCalledTimes(1);
  expect((await paper.snapshot()).lifecycle?.beforeBalance).toBe(10_000_000);
});

it("blocks start on database failure instead of falling back to ten million", async () => {
  vi.mocked(readProgramAssets).mockRejectedValue(new Error("database down"));
  const paper = await getLocalPaperRuntime("a");
  expect(await paper.run("start")).toMatchObject({ error: C.database });
  expect(await paper.snapshot()).toMatchObject({ running: false });
  expect((await paper.snapshot()).lifecycle).toBeUndefined();
});

it("does not replace a saved zero balance with the default", async () => {
  vi.mocked(readProgramAssets).mockResolvedValue({ amount: 0, source: "session", updatedAt: null });
  expect(await (await getLocalPaperRuntime("a")).run("start")).toMatchObject({ error: C.noCapital });
});

it("rejects a manual change during a session without corrupting its running state", async () => {
  const paper = await getLocalPaperRuntime("a");
  await paper.run("start");
  await expect(paper.saveAssets(500)).rejects.toThrow(C.locked);
  expect(await paper.snapshot()).toMatchObject({ running: true, lastError: null });
  expect(saveProgramAssets).not.toHaveBeenCalled();
});

it("saves final assets, reports failure, blocks a new session and retries automatically", async () => {
  vi.mocked(saveProgramAssets).mockRejectedValueOnce(new Error("database down"));
  const paper = await getLocalPaperRuntime("a");
  await paper.run("start");
  await paper.run("flatten");
  await vi.advanceTimersByTimeAsync(1);
  expect(await paper.snapshot()).toMatchObject({ lifecycle: { status: "completed" }, assetSyncStatus: "error", lastError: null });
  expect(await paper.run("new-session")).toMatchObject({ error: C.syncBeforeNew });
  await vi.advanceTimersByTimeAsync(30_000);
  expect((await paper.snapshot()).assetSyncStatus).toBe("saved");
  expect(saveProgramAssets).toHaveBeenCalledWith("a", 10_000_000, expect.objectContaining({ startedAt: expect.any(String), finishedAt: expect.any(String) }));
  expect(saveProgramAssets).toHaveBeenCalledTimes(2);
  expect(await paper.run("new-session")).not.toHaveProperty("error");
});

it("allows a manual balance before start and recovers from a manual DB failure", async () => {
  const paper = await getLocalPaperRuntime("a");
  vi.mocked(saveProgramAssets).mockRejectedValueOnce(new Error("database down"));
  await expect(paper.saveAssets(20_000_000)).rejects.toThrow(C.database);
  expect((await paper.snapshot()).lastError).toBeNull();
  await paper.saveAssets(20_000_000);
  expect(saveProgramAssets).toHaveBeenLastCalledWith("a", 20_000_000);
});

it("recovers an unsaved completed account session after a process restart", async () => {
  const state = initialState();
  state.lifecycle = {
    status: "completed", startedAt: "2026-11-26T00:00:00Z", finishedAt: "2026-11-26T00:30:00Z",
    beforeBalance: 10_000_000, afterBalance: 10_100_000, returnPct: 1, targetReturnPct: 1, reviewDecision: "keep",
  };
  state.cash = state.equity = 10_100_000;
  state.assetSyncStatus = "error";
  vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(state));
  const paper = await getLocalPaperRuntime("a");
  await vi.advanceTimersByTimeAsync(1);
  expect((await paper.snapshot()).assetSyncStatus).toBe("saved");
  expect(saveProgramAssets).toHaveBeenCalledWith("a", 10_100_000, { startedAt: state.lifecycle.startedAt, finishedAt: state.lifecycle.finishedAt });
});
