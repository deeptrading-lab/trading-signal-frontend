/**
 * Watchlist 도메인 어댑터 — 관심종목 일괄 시세 조회.
 *
 * PRD `watchlist-batch-quotes` §3.4 — 종목당 시세+메타 2N콜 합성을 폐기하고 `/api/watchlist` BFF
 * 단일 호출(`intstock_multprice` 일괄 1콜)로 재배선. BFF 가 일괄 응답을 좌조인한 `WatchlistQuote[]`
 * 를 그대로 통과한다.
 *
 * 인터페이스:
 *   `getWatchlist(tickers: string[]): Promise<WatchlistQuote[]>` — 사용자 관심 ticker 배열 입력.
 *   - tickers 영구화(localStorage)는 `useWatchlistTickers` + `store.ts` 책임.
 *   - 본 어댑터는 same-origin `/api` (`httpClient`) 만 사용 — KIS 직접 호출 금지(AGENTS.md BFF 원칙).
 *
 * ## ⚠️ 종목명 처리 (frontend 가 알아야 할 계약)
 *
 * `WatchlistQuote.name` 은 **표시명의 단일 진실이 아니다**. BFF 는 일괄응답에 종목명이 없으므로 시드
 * (symbols.json) → ticker 폴백으로만 채운다. **최종 표시명은 클라이언트가 store(`{ticker,name}`) →
 * 시드 → quote.name 순으로 결정**한다(컨테이너/테이블 책임). 일괄 응답에 누락된 ticker 는 BFF 응답에서
 * 빠지므로, 프론트가 사용자 `tickers` 기준 좌조인하여 누락 행을 디그레이드 렌더한다.
 *
 * 응답 envelope unwrap 외 추가 가공 없음 — 표시 변환(천단위 콤마 등)은 컴포넌트/표시 유틸 책임.
 */

import { httpClient } from "@/lib/api/client";
import type { WatchlistQuote } from "@/lib/api/kis/types";

/** 일괄 시세 정규 모델 — 종목명은 식별 폴백(클라 store 가 표시명 결정). 단일 진실 = `lib/api/kis/types`. */
export type { WatchlistQuote };

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
