/**
 * `/api/watchlist` BFF fallback — 관심종목 합성 데이터 모델(`WatchlistQuote[]`) mock.
 *
 * PRD `watchlist-real-data` §3.8 — KIS 미설정/타임아웃 시 BFF route 가 본 fixture 반환.
 *
 * 시세(`StockPrice` 계열) + 메타(종목명·시장)를 합친 관심종목 친화 스키마.
 * mock 안에 사용자 노출 한글 카피는 0건 — 종목명·ticker 같은 식별자만 (frontend.md §3).
 * §9 q4=국내주식만 — 코인/해외 fixture 0건.
 */

import type { WatchlistQuote } from "@/lib/api/watchlist/list";

const MOCK_QUOTES: Record<string, WatchlistQuote> = {
  "005930": {
    ticker: "005930",
    name: "삼성전자",
    market: "KOSPI",
    price: 71_500,
    change: 500,
    changePercent: 0.7,
    direction: "up",
    volume: 12_345_678,
    isTradeStopped: false,
    isAdminItem: false,
  },
  "000660": {
    ticker: "000660",
    name: "SK하이닉스",
    market: "KOSPI",
    price: 175_300,
    change: -2_700,
    changePercent: -1.52,
    direction: "down",
    volume: 4_567_890,
    isTradeStopped: false,
    isAdminItem: false,
  },
  "035420": {
    ticker: "035420",
    name: "NAVER",
    market: "KOSPI",
    price: 189_500,
    change: 0,
    changePercent: 0,
    direction: "flat",
    volume: 678_901,
    isTradeStopped: false,
    isAdminItem: false,
  },
  "035720": {
    ticker: "035720",
    name: "카카오",
    market: "KOSPI",
    price: 48_650,
    change: 350,
    changePercent: 0.72,
    direction: "up",
    volume: 1_234_567,
    isTradeStopped: false,
    isAdminItem: false,
  },
};

/**
 * ticker 목록에 대한 데이터 모델 mock 반환.
 * 시드에 없는 ticker 는 ticker 그대로 + 0 값으로 graceful degrade (화면 회귀 0).
 */
export function getMockWatchlist(
  tickers: readonly string[],
): WatchlistQuote[] {
  return tickers.map((ticker) => {
    const seed = MOCK_QUOTES[ticker];
    if (seed) return seed;
    return {
      ticker,
      name: ticker,
      price: 0,
      change: 0,
      changePercent: 0,
      direction: "flat",
      volume: 0,
    };
  });
}
