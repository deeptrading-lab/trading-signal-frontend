/**
 * Watchlist 도메인 어댑터 — 관심종목 multi-price 조회.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Watchlist 도메인 어댑터만 신설, 화면 전환 X.
 *
 * 인터페이스:
 *   `getWatchlist(tickers: string[]): Promise<WatchlistQuote[]>` — 사용자 관심 ticker 배열 입력.
 *   - tickers 영구화 (localStorage / BE) 는 후속 PR 책임. 본 어댑터는 입력 ticker 의 현재가만.
 *
 * 구현 전략:
 *   - Dashboard 어댑터와 동일 패턴 — PR-A `/api/stock/price` 반복 호출 + Promise.all.
 *   - 빈 배열 즉시 반환.
 *   - 후속 PR 이 KIS multi-price 또는 WebSocket 으로 전환 시 본 인터페이스 시그니처 유지.
 */

import { fetchStockPriceClient } from "@/lib/api/stock/price";
import type { StockPrice } from "@/lib/api/kis/types";

/**
 * 관심종목 응답 — StockPrice 그대로. 후속 PR 이 즐겨찾기 플래그 / 메모 등 추가 시 자연 확장.
 */
export type WatchlistQuote = StockPrice;

export async function getWatchlist(
  tickers: readonly string[],
): Promise<WatchlistQuote[]> {
  if (tickers.length === 0) {
    return [];
  }
  const quotes = await Promise.all(
    tickers.map((ticker) => fetchStockPriceClient(ticker)),
  );
  return quotes;
}
