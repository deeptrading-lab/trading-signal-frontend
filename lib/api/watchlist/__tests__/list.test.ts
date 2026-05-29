/**
 * `lib/api/watchlist/list.ts` 단위 테스트.
 *
 * PRD `watchlist-real-data` §3.4 — 어댑터 재배선 회귀 차단:
 *   1. 빈 배열 입력 → 빈 배열 즉시 반환 (BFF 호출 X).
 *   2. ticker 배열 → `/watchlist` BFF 단일 호출 + tickers 콤마 params + 입력 순서 보존.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  httpClient: { get: vi.fn() },
}));

import { getWatchlist, type WatchlistQuote } from "../list";
import { httpClient } from "@/lib/api/client";

const buildQuote = (ticker: string): WatchlistQuote => ({
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

  it("빈 배열 입력 시 즉시 빈 배열 반환 (BFF 호출 안 함)", async () => {
    const result = await getWatchlist([]);
    expect(result).toEqual([]);
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it("/watchlist BFF 단일 호출 + tickers 콤마 params + 입력 순서 보존", async () => {
    const getMock = httpClient.get as ReturnType<typeof vi.fn>;
    const tickers = ["005930", "035720", "000660"];
    getMock.mockResolvedValue({ data: tickers.map(buildQuote) });

    const result = await getWatchlist(tickers);

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith("/watchlist", {
      params: { tickers: "005930,035720,000660" },
    });
    expect(result.map((q) => q.ticker)).toEqual(tickers);
  });
});
