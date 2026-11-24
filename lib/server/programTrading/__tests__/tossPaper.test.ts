import { afterEach, expect, it, vi } from "vitest";
import { tossGet } from "@/lib/api/toss/client";
import { fetchPaperCandidates, fetchPaperPrices, paperSession } from "../tossPaper";

vi.mock("@/lib/api/toss/client", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/api/toss/client")>(),
  tossGet: vi.fn(),
}));

const liveTime = "2026-11-09T09:05:00+09:00";
const signal = new AbortController().signal;
const row = (symbol: string, volume: number, changeRate: string, lastPrice = "10000") => ({
  symbol, currency: "KRW", tradingVolume: String(volume), price: { lastPrice, basePrice: "9990", changeRate },
});

afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

it("selects distinct market leaders, sorts ties and includes exactly one million shares", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(liveTime));
  vi.mocked(tossGet).mockResolvedValue({
    rankedAt: liveTime,
    rankings: [
      row("035720", 1_000_000, "0.02"), row("005930", 2_000_000, "0.01"),
      row("000660", 2_000_000, "0.01"), row("000660", 1_000_000, "0.01"), row("068270", 999_999, "0.01"),
      row("051910", 2_000_000, "0"), row("003550", 2_000_000, "-0.01"), row("105560", 2_000_000, "0.02", "NaN"),
    ],
  });
  const result = await fetchPaperCandidates(signal);
  expect(result.rows.map(item => [item.ticker, item.rank, item.volume, item.changePercent])).toEqual([
    ["000660", 1, 2_000_000, 1], ["005930", 2, 2_000_000, 1], ["035720", 3, 1_000_000, 2],
  ]);
  expect(tossGet).toHaveBeenCalledExactlyOnceWith("/api/v1/rankings", {
    type: "MARKET_TRADING_VOLUME", marketCountry: "KR", duration: "realtime", count: 100,
  }, "program-paper", signal);
});

it("waits on a prior-date or empty ranking even on a weekday", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(liveTime));
  vi.mocked(tossGet).mockResolvedValueOnce({ rankedAt: "2026-11-06T15:00:00+09:00", rankings: [row("005930", 2_000_000, "0.01")] });
  vi.mocked(tossGet).mockResolvedValueOnce({ rankedAt: null, rankings: [] });
  for (let request = 0; request < 2; request++) expect(await fetchPaperCandidates(signal)).toMatchObject({ status: "empty", rows: [] });
});

it("fetches every held symbol in one request and rejects stale or unrequested quotes", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(liveTime));
  vi.mocked(tossGet).mockResolvedValue([
    { symbol: "005930", lastPrice: "10200", currency: "KRW", timestamp: liveTime },
    { symbol: "005930", lastPrice: "10100", currency: "KRW", timestamp: "2026-11-09T09:04:59+09:00" },
    { symbol: "000660", lastPrice: "10200", currency: "KRW", timestamp: "2026-11-06T15:00:00+09:00" },
    { symbol: "035720", lastPrice: "10200", currency: "KRW", timestamp: liveTime },
  ]);
  expect(await fetchPaperPrices(["005930", "000660"], signal)).toEqual(new Map([["005930", { price: 10_200, at: Date.parse(liveTime) }]]));
  expect(tossGet).toHaveBeenCalledExactlyOnceWith("/api/v1/prices", { symbols: "005930,000660" }, "program-paper", signal);
});

it("uses the KST session and identifies weekends independent of machine timezone", () => {
  expect(paperSession(Date.parse("2026-11-08T00:05:00Z")).weekend).toBe(true);
  expect(paperSession(Date.parse("2026-11-09T00:05:00Z"))).toMatchObject({
    weekend: false, minute: 545, openAt: Date.parse("2026-11-09T00:00:00Z"), closeAt: Date.parse("2026-11-09T06:00:00Z"),
  });
});
