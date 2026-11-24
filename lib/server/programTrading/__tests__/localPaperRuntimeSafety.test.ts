import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { nextPaperMarketRequestAt } from "@/lib/api/toss/paperMarketLimit";
import { initialState } from "../engine";
import { getLocalPaperRuntime } from "../localPaperRuntime";
import { emptyPaperCandidates, fetchPaperCandidates, fetchPaperPrices } from "../tossPaper";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(), readdir: vi.fn(async () => []), readFile: vi.fn(),
  appendFile: vi.fn(), rename: vi.fn(), writeFile: vi.fn(),
}));
vi.mock("../tossPaper", async importOriginal => ({
  ...await importOriginal<typeof import("../tossPaper")>(),
  requireTossPaperConfig: vi.fn(),
  fetchPaperCandidates: vi.fn(),
  fetchPaperPrices: vi.fn(),
}));
vi.mock("@/lib/api/toss/paperMarketLimit", () => ({
  nextPaperMarketRequestAt: vi.fn(() => 0), PAPER_MARKET_INTERVAL_MS: 60_000,
}));

const date = "2026-11-09";
const clock = (time: string) => Date.parse(`${date}T${time}+09:00`);
const candidates = () => ({
  ...emptyPaperCandidates(), status: "ready" as const,
  rows: [{ ticker: "005930", name: "삼성전자", price: 100_000, rank: 1, volume: 1_000_000, changePercent: 1, previousClose: 99_000, sources: ["volume" as const] }],
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(clock("09:00:00"));
  vi.stubEnv("PROGRAM_PAPER_RESULT_SYNC", undefined);
  vi.mocked(readFile).mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
  vi.mocked(fetchPaperCandidates).mockImplementation(async () => candidates());
  vi.mocked(fetchPaperPrices).mockResolvedValue(new Map());
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localTossPaperRuntime");
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

it("waits until 09:05, buys and then reads all holdings every five minutes", async () => {
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(299_999);
  expect(fetchPaperCandidates).not.toHaveBeenCalled();
  expect(fetchPaperPrices).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
  expect((await runtime.snapshot()).positions).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(299_999);
  expect(fetchPaperPrices).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchPaperPrices).toHaveBeenCalledExactlyOnceWith(["005930"], expect.any(AbortSignal));
  await vi.advanceTimersByTimeAsync(300_000);
  expect(fetchPaperPrices).toHaveBeenCalledTimes(2);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
});

it("replaces a failed ranking request at the next ten-minute interval", async () => {
  vi.setSystemTime(clock("10:13:00"));
  vi.mocked(fetchPaperCandidates).mockRejectedValueOnce(Object.assign(new Error("rate limit"), { status: 429 }));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(599_999);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
  expect((await runtime.snapshot()).positions).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(2);
  expect((await runtime.snapshot()).positions).toHaveLength(1);
});

it("does not buy after pause when a ranking returns late", async () => {
  vi.setSystemTime(clock("10:13:00"));
  let resolve!: (response: ReturnType<typeof candidates>) => void;
  vi.mocked(fetchPaperCandidates).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(1);
  await runtime.run("pause");
  resolve(candidates());
  await vi.advanceTimersByTimeAsync(1000);
  expect((await runtime.snapshot()).trades).toEqual([]);
  expect(vi.mocked(fetchPaperCandidates).mock.calls[0][0].aborted).toBe(true);
});

it("closes at 15:00 even if the final price request never returns", async () => {
  vi.setSystemTime(clock("14:57:00"));
  vi.mocked(fetchPaperPrices).mockImplementation(() => new Promise(() => undefined));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(180_000);
  expect(fetchPaperPrices).toHaveBeenCalledTimes(1);
  expect((await runtime.snapshot()).lifecycle?.status).toBe("stopping");
  await vi.advanceTimersByTimeAsync(5000);
  expect(await runtime.snapshot()).toMatchObject({
    running: false, positions: [],
    trades: [{ side: "buy" }, { side: "sell", price: 100_000, reason: "last-mark" }],
    lifecycle: { status: "completed", stopCause: "close" },
  });
});

it("blocks a weekend start and leaves browser snapshots free of market requests", async () => {
  vi.setSystemTime(Date.parse("2026-11-08T09:10:00+09:00"));
  const runtime = await getLocalPaperRuntime();
  expect(await runtime.run("start")).toHaveProperty("error");
  await runtime.snapshot();
  expect(fetchPaperCandidates).not.toHaveBeenCalled();
  expect(fetchPaperPrices).not.toHaveBeenCalled();
});

it("settles at the stored mark at close when the shared limit blocks a new request", async () => {
  vi.setSystemTime(clock("14:57:00"));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(1);
  vi.mocked(nextPaperMarketRequestAt).mockReturnValue(clock("15:01:00"));
  await vi.advanceTimersByTimeAsync(180_000);
  expect(fetchPaperPrices).not.toHaveBeenCalled();
  expect((await runtime.snapshot()).trades.at(-1)?.reason).toBe("last-mark");
});

it("keeps an older session from entering under the new rules", async () => {
  vi.setSystemTime(clock("10:00:00"));
  vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({
    ...initialState(), policyVersion: "program-v5-short-exposure",
    lifecycle: { status: "running", startedAt: new Date().toISOString(), beforeBalance: 10_000_000, targetReturnPct: 1 },
  }));
  const runtime = await getLocalPaperRuntime();
  expect(await runtime.run("start")).toHaveProperty("error");
  expect(fetchPaperCandidates).not.toHaveBeenCalled();
});

it("waits for the common dispatch slot before scanning again after the last position sells", async () => {
  vi.setSystemTime(clock("10:00:00"));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(0);
  vi.mocked(fetchPaperPrices).mockImplementationOnce(async () => {
    vi.mocked(nextPaperMarketRequestAt).mockReturnValue(Date.now() + 60_000);
    return new Map([["005930", { price: 99_000, at: Date.now() }]]);
  });
  await vi.advanceTimersByTimeAsync(300_000);
  expect((await runtime.snapshot()).positions).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(59_999);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(2);
});
