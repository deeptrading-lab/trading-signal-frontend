/**
 * 최신 영업일 조회 — 정렬 가정과 fail-soft 를 고정한다.
 *
 * 업종 랭킹 TR 에는 영업일 필드가 없어 일자별 시세로 따로 조회하는데, 그 응답의 정렬(최신순/과거순)이
 * 문서로 보장되지 않는다. 첫 원소를 믿으면 순서가 바뀌는 날 조용히 옛 날짜가 카드에 실린다.
 * 또한 이 값을 못 구했다고 랭킹 자체가 실패해서는 안 된다(BFF never-throw).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../price", () => ({ fetchStockDaily: vi.fn() }));

import { fetchLatestTradingDate, resetTradingDateCache } from "../tradingDate";
import { fetchStockDaily } from "../price";
import type { StockDailyCandle } from "../types";

const mocked = vi.mocked(fetchStockDaily);

function candle(date: string, close = 1): StockDailyCandle {
  return { date, open: 1, high: 1, low: 1, close, volume: close ? 1 : 0 };
}

describe("fetchLatestTradingDate", () => {
  beforeEach(() => {
    mocked.mockReset();
    resetTradingDateCache();
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

  it("체결 없는 자리채움 행은 거래일로 삼지 않는다", async () => {
    // 개장 전에는 오늘 날짜의 종가·거래량 0 행이 먼저 올 수 있다. 그 행이 최댓값을 차지하면
    // 아직 열리지 않은 날이 "이 시세의 거래일"로 나가 버린다.
    mocked.mockResolvedValue([candle("2026-09-07", 0), candle("2026-09-04")]);
    await expect(fetchLatestTradingDate()).resolves.toBe("2026-09-04");
  });

  it("형식이 깨진 날짜는 무시한다", async () => {
    // formatDate 는 8자리가 아닌 원본을 그대로 통과시킨다. 사전식 비교에서는 그런 값이 이길 수 있다.
    mocked.mockResolvedValue([candle("99999999"), candle("2026-09-04")]);
    await expect(fetchLatestTradingDate()).resolves.toBe("2026-09-04");
  });

  it("TTL 안에서는 다시 조회하지 않는다", async () => {
    mocked.mockResolvedValue([candle("2026-09-04")]);
    await fetchLatestTradingDate(0);
    await fetchLatestTradingDate(60_000);
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("TTL 이 지나면 다시 조회한다", async () => {
    mocked.mockResolvedValue([candle("2026-09-04")]);
    await fetchLatestTradingDate(0);
    mocked.mockResolvedValue([candle("2026-09-07")]);
    await expect(fetchLatestTradingDate(31 * 60_000)).resolves.toBe("2026-09-07");
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("실패는 캐시하지 않는다", async () => {
    mocked.mockRejectedValueOnce(new Error("KIS 500"));
    await expect(fetchLatestTradingDate(0)).resolves.toBeNull();
    mocked.mockResolvedValue([candle("2026-09-04")]);
    await expect(fetchLatestTradingDate(1_000)).resolves.toBe("2026-09-04");
  });
});
