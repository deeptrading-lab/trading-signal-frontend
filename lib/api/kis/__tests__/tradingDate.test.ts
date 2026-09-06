/**
 * 최신 영업일 조회 — 정렬 가정과 fail-soft 를 고정한다.
 *
 * 업종 랭킹 TR 에는 영업일 필드가 없어 일자별 시세로 따로 조회하는데, 그 응답의 정렬(최신순/과거순)이
 * 문서로 보장되지 않는다. 첫 원소를 믿으면 순서가 바뀌는 날 조용히 옛 날짜가 카드에 실린다.
 * 또한 이 값을 못 구했다고 랭킹 자체가 실패해서는 안 된다(BFF never-throw).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../price", () => ({ fetchStockDaily: vi.fn() }));

import { fetchLatestTradingDate } from "../tradingDate";
import { fetchStockDaily } from "../price";
import type { StockDailyCandle } from "../types";

const mocked = vi.mocked(fetchStockDaily);

function candle(date: string): StockDailyCandle {
  return { date, open: 1, high: 1, low: 1, close: 1, volume: 1 };
}

describe("fetchLatestTradingDate", () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  it("과거순으로 와도 가장 최근 영업일을 고른다", async () => {
    mocked.mockResolvedValue([candle("2026-09-02"), candle("2026-09-03"), candle("2026-09-04")]);
    await expect(fetchLatestTradingDate()).resolves.toBe("2026-09-04");
  });

  it("최신순으로 와도 같은 값을 고른다", async () => {
    mocked.mockResolvedValue([candle("2026-09-04"), candle("2026-09-03"), candle("2026-09-02")]);
    await expect(fetchLatestTradingDate()).resolves.toBe("2026-09-04");
  });

  it("조회가 실패하면 던지지 않고 null 을 준다", async () => {
    mocked.mockRejectedValue(new Error("KIS 500"));
    await expect(fetchLatestTradingDate()).resolves.toBeNull();
  });

  it("응답이 비면 null 을 준다", async () => {
    mocked.mockResolvedValue([]);
    await expect(fetchLatestTradingDate()).resolves.toBeNull();
  });
});
