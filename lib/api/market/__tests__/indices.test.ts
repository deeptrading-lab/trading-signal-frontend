/**
 * `lib/api/market/indices.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Market 어댑터 회귀 차단.
 *
 * 검증:
 *   1. 기본 codes 미입력 → KOSPI 0001 + KOSDAQ 1001 호출.
 *   2. codes 명시 입력 → 명시된 codes 만 호출.
 *   3. 빈 배열 입력 → 빈 배열 즉시 반환.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/stock/price", () => ({
  fetchStockPriceClient: vi.fn(),
}));

import { getMarketIndices, DEFAULT_INDEX_CODES } from "../indices";
import { fetchStockPriceClient } from "@/lib/api/stock/price";
import type { StockPrice } from "@/lib/api/kis/types";

const buildQuote = (ticker: string): StockPrice => ({
  ticker,
  name: ticker,
  price: 2_750,
  change: 33,
  changePercent: 1.2,
  direction: "up",
  volume: 0,
});

describe("getMarketIndices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchStockPriceClient as ReturnType<typeof vi.fn>).mockImplementation(
      (ticker: string) => Promise.resolve(buildQuote(ticker)),
    );
  });

  it("기본 codes 미입력 시 KOSPI 0001 + KOSDAQ 1001 호출", async () => {
    expect(DEFAULT_INDEX_CODES).toEqual(["0001", "1001"]);
    const result = await getMarketIndices();
    expect(fetchStockPriceClient).toHaveBeenCalledTimes(2);
    expect(result.map((q) => q.ticker)).toEqual(["0001", "1001"]);
  });

  it("codes 명시 입력 시 명시된 codes 만 호출", async () => {
    const result = await getMarketIndices(["0001"]);
    expect(fetchStockPriceClient).toHaveBeenCalledTimes(1);
    expect(fetchStockPriceClient).toHaveBeenCalledWith("0001");
    expect(result).toHaveLength(1);
  });

  it("빈 배열 입력 시 즉시 빈 배열 반환", async () => {
    const result = await getMarketIndices([]);
    expect(result).toEqual([]);
    expect(fetchStockPriceClient).not.toHaveBeenCalled();
  });
});
