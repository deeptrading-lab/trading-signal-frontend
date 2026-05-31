/**
 * `/market` 주요 지수 mock.
 *
 * PRD `market-real-data` §3.6 — 국내 3종(KOSPI/KOSDAQ/KOSPI200)만 유지.
 * 해외(S&P 500/NASDAQ)·환율(USDKRW)·코인(BTC Dominance) 4종은 별도 트랙
 * (`market-foreign-data`)에서 다루므로 본 mock 에서 제거.
 *
 * 데이터 모델 `getMockMarketIndices(codes)` (`MarketIndexQuote[]`) — BFF fallback.
 *   화면은 이제 server component 가 표시 모델 mock 을 직접 import 하지 않고,
 *   `IndicesCardContainer`(client) 가 BFF 경유 fetch → 미설정/타임아웃 시 본 데이터 모델 mock 으로 graceful degrade.
 *
 * mock 안에 사용자 노출 한글 카피는 0건 — 지수명·코드 같은 식별자만 (frontend.md §3).
 */

import { INDEX_NAME_BY_CODE, type MarketIndexQuote } from "@/lib/api/kis/types";

/**
 * 데이터 모델 fixture — 코드별 `MarketIndexQuote`.
 * BFF (`/api/market/indices`) 가 이중 게이트 미통과·타임아웃 시 반환.
 */
const MOCK_INDEX_QUOTES: Record<string, MarketIndexQuote> = {
  "0001": {
    code: "0001",
    name: "KOSPI",
    value: 2_750.23,
    change: 32.61,
    changePercent: 1.2,
    direction: "up",
    volume: 512_345_678,
    tradeAmount: 9_876_543_210_000,
    advances: 612,
    declines: 268,
    unchanged: 54,
    open: 2_720.1,
    high: 2_758.9,
    low: 2_715.4,
  },
  "1001": {
    code: "1001",
    name: "KOSDAQ",
    value: 862.14,
    change: 3.86,
    changePercent: 0.45,
    direction: "up",
    volume: 1_023_456_789,
    tradeAmount: 6_543_210_000_000,
    advances: 821,
    declines: 612,
    unchanged: 110,
    open: 858.2,
    high: 865.1,
    low: 856.7,
  },
  SPX: {
    code: "SPX",
    name: "S&P 500",
    value: 5_308.13,
    change: 18.42,
    changePercent: 0.35,
    direction: "up",
    volume: 0,
  },
  COMP: {
    code: "COMP",
    name: "NASDAQ",
    value: 16_742.39,
    change: -45.18,
    changePercent: -0.27,
    direction: "down",
    volume: 0,
  },
};

/**
 * 코드 목록에 대한 데이터 모델 mock 반환. 시드에 없는 코드는 0값 + 상수 매핑명으로 graceful degrade.
 */
export function getMockMarketIndices(
  codes: readonly string[],
): MarketIndexQuote[] {
  return codes.map((code) => {
    const seed = MOCK_INDEX_QUOTES[code];
    if (seed) return seed;
    return {
      code,
      name: INDEX_NAME_BY_CODE[code] ?? code,
      value: 0,
      change: 0,
      changePercent: 0,
      direction: "flat",
      volume: 0,
    };
  });
}
