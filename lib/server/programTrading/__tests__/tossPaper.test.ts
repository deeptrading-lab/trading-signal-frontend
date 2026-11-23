import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeApiError } from "@/lib/api/errors";
import { fetchCandlesPage } from "@/lib/api/toss/candles";
import { fetchMarketCalendar } from "@/lib/api/toss/marketCalendar";
import { fetchOrderbook } from "@/lib/api/toss/orderbook";
import { fetchTrades } from "@/lib/api/toss/trades";
import { EMPTY_ORDERBOOK } from "@/lib/types/stock/orderbook";
import { command, initialState } from "../engine";
let paper: typeof import("../tossPaper");

vi.mock("@/lib/api/toss/marketCalendar", () => ({ fetchMarketCalendar: vi.fn() }));
vi.mock("@/lib/api/toss/candles", () => ({ fetchCandlesPage: vi.fn() }));
vi.mock("@/lib/api/toss/orderbook", () => ({ fetchOrderbook: vi.fn() }));
vi.mock("@/lib/api/toss/trades", () => ({ fetchTrades: vi.fn() }));

const date = "2026-11-09";
const stamp = (time: string) => `${date}T${time}+09:00`;
const orderbook = {
  ...EMPTY_ORDERBOOK,
  isEmpty: false,
  asks: [{ price: 10_105, qty: 300 }],
  bids: [{ price: 10_100, qty: 300 }],
  updatedAt: stamp("09:15:29"),
};

const completedCandles = () => ["11", "12", "13", "14", "15"].map(minute => ({
  timestamp: stamp(`09:${minute}:00`),
  openPrice: minute === "14" ? "10000" : "9980",
  highPrice: minute === "14" ? "10105" : "10000",
  lowPrice: minute === "14" ? "9995" : "9970",
  closePrice: minute === "14" ? "10100" : "9990",
  volume: minute === "14" ? "200" : "100",
}));

beforeEach(async () => {
  vi.resetModules();
  paper = await import("../tossPaper");
  vi.useFakeTimers();
  vi.setSystemTime(new Date(stamp("09:15:30")));
  vi.mocked(fetchMarketCalendar).mockResolvedValue({
    today: { date, integrated: { regularMarket: { startTime: stamp("09:00:00"), endTime: stamp("15:30:00") } } },
  });
  vi.mocked(fetchCandlesPage).mockResolvedValue({ candles: completedCandles() });
  vi.mocked(fetchOrderbook).mockResolvedValue(orderbook);
  vi.mocked(fetchTrades).mockResolvedValue([{ price: 10_100, volume: 1, timestamp: stamp("09:15:29") }]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

async function startPaper() {
  const session = await paper.tossPaperSession();
  const state = { ...initialState(), executionMode: "toss-paper" as const };
  state.candidates = {
    status: "ready",
    rows: [{ ticker: "005930", name: "삼성전자", price: 10_100, changePercent: 1, previousClose: 10000, sources: ["volume"] }],
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
  };
  state.minute = session.minute;
  command(state, "start");
  return { session, state };
}

describe("Toss market data in local paper trading", () => {
  it("books a virtual fill only after a fresh breakout", async () => {
    const { state, session } = await startPaper();
    expect(state.candidates.rows.map(row => row.ticker)).toEqual(["005930"]);
    expect(state.trades).toHaveLength(0);
    await paper.stepTossPaper(state, session);
    expect(state.trades).toEqual([expect.objectContaining({ ticker: "005930", side: "buy" })]);
    expect(state.cash).toBeLessThan(state.initial);
    expect(state.quotes[0]).toMatchObject({
      bid: 10_100, ask: 10_105, bidQty: 300, askQty: 300, previousHigh: 10_000, volumeRatio: 2,
      signal: { closedAt: Date.parse(stamp("09:15:00")), open: 10_000, close: 10_100 },
    });
  });

  it("skips a virtual fill when the orderbook is stale or a completed minute is missing", async () => {
    const { state, session } = await startPaper();
    vi.mocked(fetchOrderbook).mockResolvedValueOnce({ ...orderbook, updatedAt: stamp("09:15:24") });
    vi.mocked(fetchCandlesPage).mockRejectedValueOnce(new Error("분봉 조회 실패"));
    await paper.stepTossPaper(state, session);
    expect(state.trades).toHaveLength(0);

    vi.mocked(fetchCandlesPage).mockResolvedValueOnce({ candles: [{ timestamp: stamp("09:15:00"), volume: "200" }] });
    await paper.stepTossPaper(state, session);
    expect(fetchCandlesPage).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(stamp("09:15:59")));
    vi.mocked(fetchTrades).mockResolvedValue([{ price: 10_100, volume: 1, timestamp: stamp("09:15:58") }]);
    vi.mocked(fetchOrderbook).mockResolvedValue({ ...orderbook, updatedAt: stamp("09:15:58") });
    await paper.stepTossPaper(state, session);
    expect(fetchCandlesPage).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(stamp("09:16:00")));
    await paper.stepTossPaper(state, session);
    expect(fetchCandlesPage).toHaveBeenCalledTimes(2);
    expect(state.trades).toHaveLength(0);
    expect(state.quotes[0]?.previousHigh).toBe(0);
  });

  it("reuses valid completed candles until the minute changes", async () => {
    const { state, session } = await startPaper();
    // Keep the session without a position while testing the candle cache.
    vi.mocked(fetchTrades).mockResolvedValue([{ price: 10_090, volume: 1, timestamp: stamp("09:15:29") }]);
    await paper.stepTossPaper(state, session);
    expect(state.positions).toHaveLength(0);
    expect(fetchCandlesPage).toHaveBeenCalledWith("005930", "1m", {
      count: 4, before: new Date(stamp("09:14:59")).toISOString().replace(".000", ".999"), source: "program-paper",
    });
    vi.setSystemTime(new Date(stamp("09:15:32")));
    await paper.stepTossPaper(state, session);
    expect(fetchCandlesPage).toHaveBeenCalledTimes(1);
    expect(fetchTrades).toHaveBeenCalledTimes(2);
    expect(fetchOrderbook).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date(stamp("09:16:00")));
    await paper.stepTossPaper(state, session);
    expect(fetchCandlesPage).toHaveBeenCalledTimes(2);
  });

  it("checks the held quote without fetching candidate candles even on a new minute", async () => {
    const { state, session } = await startPaper();
    await paper.stepTossPaper(state, session);
    expect(state.positions).toHaveLength(1);
    vi.setSystemTime(new Date(stamp("09:16:00")));
    state.lastStepAt = Date.now() - 5_000;
    state.positions[0].lastFreshAt = state.lastStepAt;
    vi.mocked(fetchTrades).mockResolvedValue([{ price: 10_100, volume: 1, timestamp: stamp("09:16:00") }]);
    vi.mocked(fetchOrderbook).mockResolvedValue({ ...orderbook, updatedAt: stamp("09:16:00") });
    await paper.stepTossPaper(state, session);
    expect(fetchCandlesPage).toHaveBeenCalledTimes(1);
    expect(fetchTrades).toHaveBeenCalledTimes(2);
    expect(fetchOrderbook).toHaveBeenCalledTimes(2);
  });

  it("pauses candle calls for every candidate across the minute boundary after a 429", async () => {
    const { state, session } = await startPaper();
    state.candidates.rows.push({ ...state.candidates.rows[0], ticker: "000660" });
    vi.mocked(fetchCandlesPage).mockRejectedValueOnce(makeApiError("server", { status: 429 }));
    await paper.stepTossPaper(state, session);
    for (const time of ["09:16:00", "09:16:29", "09:16:30"]) {
      vi.setSystemTime(new Date(stamp(time)));
      state.lastStepAt = Date.now() - 5_000;
      state.tick = 1;
      await paper.stepTossPaper(state, session);
      expect(fetchCandlesPage).toHaveBeenCalledTimes(time === "09:16:30" ? 2 : 1);
    }
    expect(fetchCandlesPage).toHaveBeenLastCalledWith("000660", "1m", expect.objectContaining({ count: 4 }));
    expect(state.positions).toHaveLength(0);
  });

  it("rejects starting on a holiday or without a calendar for the current day", async () => {
    vi.mocked(fetchMarketCalendar).mockResolvedValueOnce({ today: { date, integrated: null } });
    expect(await paper.tossPaperSession()).toMatchObject({ canStart: false, holiday: true, open: false });
    vi.mocked(fetchMarketCalendar).mockResolvedValueOnce(null);
    expect(await paper.tossPaperSession()).toMatchObject({ canStart: false, holiday: false, open: false });
  });
  it("uses the same day's known calendar during a brief outage", async () => {
    const { session } = await startPaper();
    vi.mocked(fetchMarketCalendar).mockResolvedValueOnce(null);
    expect(await paper.tossPaperSession(session)).toMatchObject({ open: true, close: session.close });
    vi.setSystemTime(new Date("2026-11-10T15:21:00+09:00"));
    vi.mocked(fetchMarketCalendar).mockResolvedValueOnce(null);
    expect(await paper.tossPaperSession(session)).toMatchObject({
      open: false, close: Date.parse("2026-11-10T15:20:00+09:00"),
    });
  });

  it("pauses new buys while recommendations are unavailable and resumes on recovery", async () => {
    const { state, session } = await startPaper();
    const candidates = state.candidates;
    state.candidates = { ...candidates, status: "unavailable" };
    await paper.stepTossPaper(state, session);
    expect(state.running).toBe(true);
    expect(state.positions).toHaveLength(0);
    state.candidates = candidates;
    await paper.stepTossPaper(state, session);
    expect(state.positions).toHaveLength(1);
  });

  it("closes normally with fresh held quotes even when candles fail", async () => {
    const { state, session } = await startPaper();
    await paper.stepTossPaper(state, session);
    state.quotes = [];
    command(state, "flatten");
    vi.mocked(fetchCandlesPage).mockRejectedValue(new Error("분봉 조회 실패"));
    await paper.stepTossPaper(state, session);
    expect(fetchCandlesPage).toHaveBeenCalledTimes(1);
    expect(state.lifecycle).toMatchObject({ status: "completed" });
    expect(state.lifecycle?.forcedAt).toBeUndefined();
    expect(state.trades.at(-1)).toMatchObject({ side: "sell", reason: "manual" });
  });

});


describe("completed candle signal and execution inputs", () => {
  it("ignores changes in the in-progress minute", async () => {
    const { state, session } = await startPaper();
    const candles = completedCandles();
    Object.assign(candles[4], { highPrice: "999999", closePrice: "1", volume: "999999" });
    vi.mocked(fetchCandlesPage).mockResolvedValueOnce({ candles });
    await paper.stepTossPaper(state, session);
    expect(state.quotes[0]?.signal).toMatchObject({ previousHigh: 10_000, volumeRatio: 2, close: 10_100 });
    expect(state.positions).toHaveLength(1);
  });

  it.each(["missing minute", "nonfinite price", "inconsistent OHLC", "non-boundary timestamp"])("rejects %s in the four completed candles", async fault => {
    const { state, session } = await startPaper();
    const candles = completedCandles();
    if (fault === "missing minute") candles.splice(1, 1);
    if (fault === "nonfinite price") candles[1].openPrice = "NaN";
    if (fault === "inconsistent OHLC") candles[3].lowPrice = "10200";
    if (fault === "non-boundary timestamp") candles[1].timestamp = stamp("09:12:30");
    vi.mocked(fetchCandlesPage).mockResolvedValueOnce({ candles });
    await paper.stepTossPaper(state, session);
    expect(state.quotes[0]?.signal).toBeUndefined();
    expect(state.positions).toHaveLength(0);
  });

  it("rejects nonfinite or empty executable orderbook depth", async () => {
    const { state, session } = await startPaper();
    vi.mocked(fetchOrderbook).mockResolvedValueOnce({ ...orderbook, asks: [{ price: 10_105, qty: NaN }] });
    await paper.stepTossPaper(state, session);
    expect(state.quotes).toHaveLength(0);
    expect(state.positions).toHaveLength(0);
  });

  it("ends the new entry window at 14:30 while leaving the market open", async () => {
    vi.setSystemTime(new Date(stamp("14:29:59")));
    expect(await paper.tossPaperSession()).toMatchObject({ open: true, canStart: true });
    vi.setSystemTime(new Date(stamp("14:30:00")));
    expect(await paper.tossPaperSession()).toMatchObject({ open: true, canStart: false });
  });
});
