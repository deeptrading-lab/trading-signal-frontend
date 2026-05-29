/**
 * `lib/api/market/indices.ts` 단위 테스트.
 *
 * PRD `market-real-data` §3.4 — 어댑터 재배선 회귀 차단.
 *
 * 검증:
 *   1. 기본 codes 미입력 → 국내 3종(0001/1001/2001)으로 `/market/indices` 단일 호출.
 *   2. codes 명시 입력 → 명시된 codes 로 호출.
 *   3. 빈 배열 입력 → HTTP 호출 없이 즉시 빈 배열 반환.
 *   4. `/api/stock/price` 반복 호출이 아니라 `/market/indices` 단일 BFF 호출.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  httpClient: { get: vi.fn() },
}));

import { getMarketIndices, DEFAULT_INDEX_CODES } from "../indices";
import { httpClient } from "@/lib/api/client";
import type { MarketIndexQuote } from "@/lib/api/kis/types";

const buildQuote = (code: string): MarketIndexQuote => ({
  code,
  name: code,
  value: 2_750,
  change: 33,
  changePercent: 1.2,
  direction: "up",
  volume: 0,
});

const mockGet = httpClient.get as ReturnType<typeof vi.fn>;

describe("getMarketIndices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((_url: string, config?: { params?: { codes?: string[] } }) => {
      const codes = config?.params?.codes ?? [];
      return Promise.resolve({ data: codes.map(buildQuote) });
    });
  });

  it("기본 codes 미입력 시 국내 3종(0001/1001/2001)으로 /market/indices 단일 호출", async () => {
    expect(DEFAULT_INDEX_CODES).toEqual(["0001", "1001", "2001"]);
    const result = await getMarketIndices();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      "/market/indices",
      expect.objectContaining({
        params: { codes: ["0001", "1001", "2001"] },
      }),
    );
    expect(result.map((q) => q.code)).toEqual(["0001", "1001", "2001"]);
  });

  it("codes 명시 입력 시 명시된 codes 로 호출", async () => {
    const result = await getMarketIndices(["0001"]);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      "/market/indices",
      expect.objectContaining({ params: { codes: ["0001"] } }),
    );
    expect(result).toHaveLength(1);
  });

  it("빈 배열 입력 시 HTTP 호출 없이 즉시 빈 배열 반환", async () => {
    const result = await getMarketIndices([]);
    expect(result).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
