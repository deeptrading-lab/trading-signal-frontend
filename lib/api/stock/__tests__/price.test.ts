/**
 * `lib/api/stock/price.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` (PR-B) — BFF 라운드트립 클라이언트 정합 회귀 차단.
 *
 * 검증:
 *   1. ticker 를 query param 으로 전달 + same-origin `/stock/price` 경로 호출.
 *   2. axios 응답 envelope unwrap (`response.data` 만 반환).
 *   3. KIS 직접 호출 0건 — httpClient (baseURL=/api) 만 사용.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// axios 인터셉터 / baseURL 의 부수효과 회피를 위해 httpClient 를 통째로 mock.
vi.mock("@/lib/api/client", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

import { fetchStockPriceClient } from "../price";
import { httpClient } from "@/lib/api/client";
import type { StockPrice } from "@/lib/api/kis/types";

const MOCK_PRICE: StockPrice = {
  ticker: "005930",
  name: "삼성전자",
  price: 71_500,
  change: 500,
  changePercent: 0.7,
  direction: "up",
  volume: 12_345_678,
};

describe("fetchStockPriceClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ticker 를 query 로 넘기고 /stock/price 호출", async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_PRICE,
    });
    const result = await fetchStockPriceClient("005930");
    expect(httpClient.get).toHaveBeenCalledWith("/stock/price", {
      params: { ticker: "005930" },
    });
    expect(result).toEqual(MOCK_PRICE);
  });
});
