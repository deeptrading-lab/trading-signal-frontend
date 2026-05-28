/**
 * `lib/api/stock/daily.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` (PR-B).
 *
 * 검증:
 *   1. ticker + period 를 query 로 전달.
 *   2. period 기본값 "D".
 *   3. 응답 unwrap.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

import { fetchStockDailyClient } from "../daily";
import { httpClient } from "@/lib/api/client";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const CANDLE: StockDailyCandle = {
  date: "2026-05-27",
  open: 71_000,
  high: 71_800,
  low: 70_900,
  close: 71_500,
  volume: 11_000_000,
};

describe("fetchStockDailyClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("period 명시 시 그대로 전달", async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [CANDLE],
    });
    const result = await fetchStockDailyClient("005930", "W");
    expect(httpClient.get).toHaveBeenCalledWith("/stock/daily", {
      params: { ticker: "005930", period: "W" },
    });
    expect(result).toEqual([CANDLE]);
  });

  it("period 미지정 시 기본 'D'", async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [CANDLE],
    });
    await fetchStockDailyClient("005930");
    expect(httpClient.get).toHaveBeenCalledWith("/stock/daily", {
      params: { ticker: "005930", period: "D" },
    });
  });
});
