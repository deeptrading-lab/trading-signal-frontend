/**
 * `lib/api/watchlist/list.ts` 단위 테스트.
 *
 * PRD `watchlist-real-data` §3.4 — 어댑터 재배선 회귀 차단:
 *   1. 빈 배열 입력 → 빈 배열 즉시 반환 (BFF 호출 X).
 *   2. ticker 배열 → `/watchlist` BFF 단일 호출 + tickers 콤마 params + 입력 순서 보존.
 *
 * `fix/intraday-watchlist-softcap` — 30개 초과 방어:
 *   3. ≤30 은 단일 호출(무변경). >30 은 30단위 청크로 나눠 각각 요청 + 청크 순서대로 병합
 *      (route soft cap 30 조용한 절단 방지).
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

  it("30개 이하면 청크 없이 단일 호출을 유지한다(무변경 no-op)", async () => {
    const getMock = httpClient.get as ReturnType<typeof vi.fn>;
    const tickers = Array.from({ length: 30 }, (_, i) =>
      String(i).padStart(6, "0"),
    );
    getMock.mockResolvedValue({ data: tickers.map(buildQuote) });

    await getWatchlist(tickers);

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith("/watchlist", {
      params: { tickers: tickers.join(",") },
    });
  });

  it("30개 초과면 30단위 청크로 나눠 요청하고 청크 순서대로 병합한다", async () => {
    const getMock = httpClient.get as ReturnType<typeof vi.fn>;
    const tickers = Array.from({ length: 32 }, (_, i) =>
      String(i).padStart(6, "0"),
    );
    // 각 호출은 요청한 티커만 담은 응답을 돌려준다(route 청크 경계 모사).
    getMock.mockImplementation((_url: string, config: { params: { tickers: string } }) => {
      const requested = config.params.tickers.split(",");
      return Promise.resolve({ data: requested.map(buildQuote) });
    });

    const result = await getWatchlist(tickers);

    expect(getMock).toHaveBeenCalledTimes(2);
    // 첫 청크 = 앞 30개, 둘째 청크 = 나머지 2개. 각 요청은 ≤ soft cap.
    expect(getMock.mock.calls[0][1].params.tickers).toBe(tickers.slice(0, 30).join(","));
    expect(getMock.mock.calls[1][1].params.tickers).toBe(tickers.slice(30).join(","));
    // 병합 결과 = 입력 순서 전부 보존(절단 0).
    expect(result.map((q) => q.ticker)).toEqual(tickers);
  });
});
