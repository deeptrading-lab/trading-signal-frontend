import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { nextPaperMarketRequestAt } from "@/lib/api/toss/paperMarketLimit";
import type { Position } from "@/lib/types/programTrading/programTrading";
import { initialState, startSession } from "../engine";
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

function restorePortfolio(priceTime = "10:05:00", candidateTime = "10:00:00", cash = 1_000_000) {
  const state = initialState(clock("09:05:00"), cash + 300_000);
  state.cash = cash;
  state.positions = ["005930", "000660", "035720"].map(ticker => ({
    ticker, quantity: 1, entry: 100_000, mark: 100_000, lastFreshAt: clock("09:05:00"),
  }));
  startSession(state, clock("09:05:00"), clock("09:05:00"));
  state.nextPriceAt = clock(priceTime);
  state.nextCandidateAt = clock(candidateTime);
  vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(state));
  return state;
}

function newCandidates() {
  return { ...candidates(), rows: ["005930", "000660", "035720", "068270", "051910"].map((ticker, index) => ({
    ...candidates().rows[0], ticker, name: ticker, rank: index + 1,
  })) };
}

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

it("보유 3종목이 남아 있어도 잔여 현금으로 신규 종목을 매수하고 기존 매도 점검을 유지한다", async () => {
  vi.setSystemTime(clock("10:00:00"));
  restorePortfolio();
  vi.mocked(fetchPaperCandidates).mockImplementation(async () => newCandidates());
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(0);
  expect((await runtime.snapshot()).positions.map((p: Position) => [p.ticker, p.quantity])).toEqual([
    ["005930", 1], ["000660", 1], ["035720", 1], ["068270", 5], ["051910", 5],
  ]);
  expect((await runtime.snapshot()).cash).toBe(0);
  await vi.advanceTimersByTimeAsync(300_000);
  expect(fetchPaperPrices).toHaveBeenCalledExactlyOnceWith(["005930", "000660", "035720", "068270", "051910"], expect.any(AbortSignal));
  await vi.advanceTimersByTimeAsync(300_000);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
});

it("매수·매도 점검이 겹치면 매도부터 처리하고 공통 호출 간격 후 확정 현금으로 매수한다", async () => {
  vi.setSystemTime(clock("10:05:00"));
  restorePortfolio("10:05:00", "10:05:00", 0);
  vi.mocked(fetchPaperPrices).mockImplementationOnce(async () => {
    vi.mocked(nextPaperMarketRequestAt).mockReturnValue(Date.now() + 60_000);
    return new Map([["005930", { price: 102_000, at: Date.now() }]]);
  });
  vi.mocked(fetchPaperCandidates).mockImplementation(async () => ({ ...candidates(), rows: [{ ...candidates().rows[0], ticker: "068270", price: 10_000 }] }));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(0);
  expect(fetchPaperPrices).toHaveBeenCalledTimes(1);
  expect(fetchPaperCandidates).not.toHaveBeenCalled();
  expect((await runtime.snapshot()).cash).toBe(102_000);
  await vi.advanceTimersByTimeAsync(59_999);
  expect(fetchPaperCandidates).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect((await runtime.snapshot()).positions.map((p: Position) => [p.ticker, p.quantity])).toEqual([["000660", 1], ["035720", 1], ["068270", 10]]);
  expect((await runtime.snapshot()).cash).toBe(2_000);
  expect((await runtime.snapshot()).nextPriceAt).toBe(clock("10:10:00"));
});

it("다음 매도 점검이 가까우면 후보 조회를 대기해 매도용 호출 슬롯을 남긴다", async () => {
  vi.setSystemTime(clock("10:00:00"));
  restorePortfolio("10:01:00");
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(59_999);
  expect(fetchPaperCandidates).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchPaperPrices).toHaveBeenCalledTimes(1);
});

it("보유 중 후보 조회가 실패해도 보유분을 유지하고 5분 매도 점검을 계속한다", async () => {
  vi.setSystemTime(clock("10:00:00"));
  restorePortfolio();
  vi.mocked(fetchPaperCandidates).mockRejectedValueOnce(new Error("unavailable"));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(0);
  expect((await runtime.snapshot()).positions).toHaveLength(3);
  expect((await runtime.snapshot()).cash).toBe(1_000_000);
  expect((await runtime.snapshot()).nextCandidateAt).toBe(clock("10:10:00"));
  await vi.advanceTimersByTimeAsync(300_000);
  expect(fetchPaperPrices).toHaveBeenCalledTimes(1);
});

it.each(["pause", "15:00"])("보유 중 추가 매수 응답이 %s 이후 도착하면 매수하지 않는다", async boundary => {
  vi.setSystemTime(clock(boundary === "pause" ? "10:00:00" : "14:59:59"));
  restorePortfolio(boundary === "pause" ? "10:05:00" : "15:04:00", boundary === "pause" ? "10:00:00" : "14:59:59");
  let resolve!: (response: ReturnType<typeof newCandidates>) => void;
  vi.mocked(fetchPaperCandidates).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(0);
  if (boundary === "pause") await runtime.run("pause");
  else await vi.advanceTimersByTimeAsync(1000);
  resolve(newCandidates());
  await vi.advanceTimersByTimeAsync(1000);
  expect((await runtime.snapshot()).positions).toHaveLength(3);
  expect((await runtime.snapshot()).trades).toEqual([]);
  expect((await runtime.snapshot()).cash).toBe(1_000_000);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
});

it("잔여 현금이 유지되면 보유 중에도 10분 주기로 신규 후보를 다시 확인한다", async () => {
  vi.setSystemTime(clock("10:00:00"));
  restorePortfolio();
  vi.mocked(fetchPaperCandidates).mockImplementation(async () => ({ ...candidates(), rows: [{ ...candidates().rows[0], ticker: "068270", price: 2_000_000 }] }));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(599_999);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1001);
  expect(fetchPaperPrices).toHaveBeenCalledTimes(2);
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(2);
  expect((await runtime.snapshot()).positions).toHaveLength(3);
  expect((await runtime.snapshot()).cash).toBe(1_000_000);
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

it("closes at 15:30 even if the final price request never returns", async () => {
  vi.setSystemTime(clock("14:57:00"));
  vi.mocked(fetchPaperPrices).mockImplementation(() => new Promise(() => undefined));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(1_980_000);
  expect(fetchPaperPrices).toHaveBeenCalled();
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
  vi.mocked(nextPaperMarketRequestAt).mockReturnValue(clock("15:31:00"));
  vi.setSystemTime(clock("15:29:59"));
  await vi.advanceTimersByTimeAsync(2000);
  expect(fetchPaperPrices).not.toHaveBeenCalled();
  expect((await runtime.snapshot()).trades.at(-1)?.reason).toBe("last-mark");
});

it("closes all holdings on positive total return after 15:00 and records the reason", async () => {
  vi.setSystemTime(clock("14:59:00"));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(1);
  vi.mocked(fetchPaperPrices).mockImplementation(async () => new Map([["005930", { price: 100_100, at: Date.now() }]]));
  await vi.advanceTimersByTimeAsync(300_000);
  expect(await runtime.snapshot()).toMatchObject({
    positions: [], running: false,
    lifecycle: { status: "completed", stopCause: "afternoon-profit" },
  });
  expect((await runtime.snapshot()).trades.at(-1)?.reason).toBe("afternoon-profit");
  expect(fetchPaperCandidates).toHaveBeenCalledTimes(1);
});

it("discards a candidate response crossing 15:00 and does not enter again", async () => {
  vi.setSystemTime(clock("14:59:59"));
  let resolve!: (response: ReturnType<typeof candidates>) => void;
  vi.mocked(fetchPaperCandidates).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(1000);
  resolve(candidates());
  await vi.advanceTimersByTimeAsync(1000);
  expect((await runtime.snapshot()).trades).toEqual([]);
  expect(await runtime.run("start")).toHaveProperty("error");
});

it("settles paused holdings at 15:30 even at a loss", async () => {
  vi.setSystemTime(clock("14:59:00"));
  const runtime = await getLocalPaperRuntime();
  await runtime.run("start");
  await vi.advanceTimersByTimeAsync(1);
  await runtime.run("pause");
  vi.mocked(fetchPaperPrices).mockImplementation(async () => new Map([["005930", { price: 99_500, at: Date.now() }]]));
  vi.setSystemTime(clock("15:29:59"));
  await vi.advanceTimersByTimeAsync(2000);
  expect(await runtime.snapshot()).toMatchObject({
    positions: [], running: false, lifecycle: { status: "completed", stopCause: "close" },
  });
  expect((await runtime.snapshot()).trades.at(-1)).toMatchObject({ price: 99_500, reason: "close" });
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
