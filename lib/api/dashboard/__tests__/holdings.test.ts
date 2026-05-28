/**
 * `lib/api/dashboard/holdings.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Dashboard 어댑터 회귀 차단.
 *
 * 검증:
 *   1. 빈 배열 입력 → 빈 배열 즉시 반환 (네트워크 호출 0).
 *   2. ticker 배열 → 각 ticker 별 fetchStockPriceClient 병렬 호출 (Promise.all).
 *   3. 결과 순서 = 입력 ticker 순서 (Promise.all 정합).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/stock/price", () => ({
  fetchStockPriceClient: vi.fn(),
}));

import { getHoldings } from "../holdings";
import { fetchStockPriceClient } from "@/lib/api/stock/price";
import type { StockPrice } from "@/lib/api/kis/types";

const buildQuote = (ticker: string, price: number): StockPrice => ({
  ticker,
  name: ticker,
  price,
  change: 0,
  changePercent: 0,
  direction: "flat",
  volume: 0,
});

describe("getHoldings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("빈 배열 입력 시 즉시 빈 배열 반환, 네트워크 호출 0", async () => {
    const result = await getHoldings([]);
    expect(result).toEqual([]);
    expect(fetchStockPriceClient).not.toHaveBeenCalled();
  });

  it("ticker 별 fetchStockPriceClient 병렬 호출 + 입력 순서 보존", async () => {
    const mockFn = fetchStockPriceClient as ReturnType<typeof vi.fn>;
    mockFn.mockImplementation((ticker: string) =>
      Promise.resolve(buildQuote(ticker, ticker === "005930" ? 71_500 : 1_000)),
    );
    const result = await getHoldings(["005930", "035720"]);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, "005930");
    expect(mockFn).toHaveBeenNthCalledWith(2, "035720");
    expect(result.map((q) => q.ticker)).toEqual(["005930", "035720"]);
    expect(result[0].price).toBe(71_500);
  });
});
