import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCandlesPage } from "@/lib/api/toss/candles";
import { fetchMarketCalendar } from "@/lib/api/toss/marketCalendar";
import { fetchOrderbook } from "@/lib/api/toss/orderbook";
import { fetchTrades } from "@/lib/api/toss/trades";
import { EMPTY_ORDERBOOK } from "@/lib/types/stock/orderbook";
import { command, initialState } from "../engine";
import { stepTossPaper, tossPaperSession } from "../tossPaper";

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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(stamp("09:15:30")));
  vi.mocked(fetchMarketCalendar).mockResolvedValue({
    today: { date, integrated: { regularMarket: { startTime: stamp("09:00:00"), endTime: stamp("15:30:00") } } },
  });
  vi.mocked(fetchCandlesPage).mockResolvedValue({ candles: ["12", "13", "14", "15"].map(minute => ({
    timestamp: stamp(`09:${minute}:00`),
    highPrice: minute === "15" ? "10120" : "10000",
    volume: minute === "15" ? "200" : "100",
  })) });
  vi.mocked(fetchOrderbook).mockResolvedValue(orderbook);
  vi.mocked(fetchTrades).mockResolvedValue([{ price: 10_100, volume: 1, timestamp: stamp("09:15:29") }]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

async function startPaper() {
  const session = await tossPaperSession();
  const state = { ...initialState(), executionMode: "toss-paper" as const };
  state.candidates = {
    status: "ready",
    rows: [{ ticker: "005930", name: "삼성전자", price: 10_100, sources: ["volume"] }],
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
    await stepTossPaper(state, session);
    expect(state.trades).toEqual([expect.objectContaining({ ticker: "005930", side: "buy" })]);
    expect(state.cash).toBeLessThan(state.initial);
  });

  it("skips a virtual fill when the orderbook is stale or a completed minute is missing", async () => {
    const { state, session } = await startPaper();
    vi.mocked(fetchOrderbook).mockResolvedValueOnce({ ...orderbook, updatedAt: stamp("09:15:24") });
    await stepTossPaper(state, session);
    expect(state.trades).toHaveLength(0);

    vi.mocked(fetchCandlesPage).mockResolvedValueOnce({ candles: [{ timestamp: stamp("09:15:00"), volume: "200" }] });
    await stepTossPaper(state, session);
    expect(state.trades).toHaveLength(0);
    expect(state.quotes[0]?.previousHigh).toBe(0);
  });

  it("rejects starting on a holiday or without a calendar for the current day", async () => {
    vi.mocked(fetchMarketCalendar).mockResolvedValueOnce({ today: { date, integrated: null } });
    expect(await tossPaperSession()).toMatchObject({ canStart: false, holiday: true, open: false });
    vi.mocked(fetchMarketCalendar).mockResolvedValueOnce(null);
    expect(await tossPaperSession()).toMatchObject({ canStart: false, holiday: false, open: false });
  });
});
