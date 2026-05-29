/**
 * Watchlist 도메인 어댑터 — 관심종목 시세+메타 합성 조회.
 *
 * PRD `watchlist-real-data` §3.4 — 기존 `fetchStockPriceClient` 반복 임시구현을 제거하고
 * `/api/watchlist` BFF 단일 호출로 재배선. BFF 가 종목당 시세(`inquire-price`) +
 * 메타(`search-stock-info`) 를 합성한 `WatchlistQuote[]` 를 그대로 통과한다.
 *
 * 인터페이스:
 *   `getWatchlist(tickers: string[]): Promise<WatchlistQuote[]>` — 사용자 관심 ticker 배열 입력.
 *   - tickers 영구화(localStorage→engine DB)는 `useWatchlistTickers` + `store.ts` 책임.
 *   - 본 어댑터는 same-origin `/api` (`httpClient`) 만 사용 — KIS 직접 호출 금지(AGENTS.md BFF 원칙).
 *
 * 응답 envelope unwrap 외 추가 가공 없음 — 표시 변환(천단위 콤마 등)은 컴포넌트/표시 유틸 책임.
 */

import { httpClient } from "@/lib/api/client";
import type { StockMarket } from "@/lib/api/kis/types";

/**
 * 관심종목 표시 모델 — 시세 + 메타 합성. frontend 가 행 렌더에 바로 쓰기 좋은 스키마.
 *
 * - 시세(`inquire-price`): price/change/changePercent/direction/volume.
 * - 메타(`search-stock-info`, 실전 전용): name/market/isTradeStopped/isAdminItem.
 *   prod 아님/키 미설정 시 name 은 symbols.json 시드 name → ticker fallback, market/경고는 미동봉.
 */
export type WatchlistQuote = {
  ticker: string;
  /** 표시용 종목명 — 메타 `prdt_abrv_name` → 시드 name → ticker. */
  name: string;
  /** 시장 배지 — 메타 호출(prod) 시에만. */
  market?: StockMarket;
  price: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  /** 거래정지 경고 배지 — 메타 호출(prod) 시에만. */
  isTradeStopped?: boolean;
  /** 관리종목 경고 배지 — 메타 호출(prod) 시에만. */
  isAdminItem?: boolean;
};

export async function getWatchlist(
  tickers: readonly string[],
): Promise<WatchlistQuote[]> {
  if (tickers.length === 0) {
    return [];
  }
  const response = await httpClient.get<WatchlistQuote[]>("/watchlist", {
    params: { tickers: tickers.join(",") },
  });
  return response.data;
}
