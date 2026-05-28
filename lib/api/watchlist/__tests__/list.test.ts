/**
 * `lib/api/watchlist/list.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Watchlist 어댑터 회귀 차단.
 *
 * 검증:
 *   1. 빈 배열 입력 → 빈 배열 즉시 반환.
 *   2. ticker 배열 → 각 ticker 별 fetchStockPriceClient 병렬 호출 + 입력 순서 보존.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/stock/price", () => ({
  fetchStockPriceClient: vi.fn(),
}));

import { getWatchlist } from "../list";
import { fetchStockPriceClient } from "@/lib/api/stock/price";
import type { StockPrice } from "@/lib/api/kis/types";

const buildQuote = (ticker: string): StockPrice => ({
  ticker,
  name: ticker,
  price: 1_000,
  change: 0,
  changePercent: 0,
  direction: "flat",
  volume: 0,
});

describe("getWatchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("빈 배열 입력 시 즉시 빈 배열 반환", async () => {
    const result = await getWatchlist([]);
    expect(result).toEqual([]);
    expect(fetchStockPriceClient).not.toHaveBeenCalled();
  });

  it("ticker 별 fetchStockPriceClient 병렬 호출 + 입력 순서 보존", async () => {
    const mockFn = fetchStockPriceClient as ReturnType<typeof vi.fn>;
    mockFn.mockImplementation((ticker: string) =>
      Promise.resolve(buildQuote(ticker)),
    );
    const result = await getWatchlist(["005930", "035720", "000660"]);
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(result.map((q) => q.ticker)).toEqual([
      "005930",
      "035720",
      "000660",
    ]);
  });
});
