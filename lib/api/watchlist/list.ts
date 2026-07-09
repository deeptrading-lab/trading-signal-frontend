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
 * ## ⚠️ 30개 초과 시 청크 분할 (조용한 절단 방지)
 *
 * `/api/watchlist` route 는 요청당 **soft cap 30**(`SOFT_CAP`)으로 31번째부터 조용히 잘라낸다
 * (헤더로만 통지). 단타 워치처럼 여러 목록을 합쳐 30을 넘길 수 있는 소비처가 절단으로 시세 "—" 를
 * 만나지 않도록, 30 초과 입력은 `WATCHLIST_CHUNK_SIZE`(=cap) 단위로 나눠 병렬 요청 후 **입력 순서대로**
 * 병합한다. 각 청크는 ≤ cap 이라 절단이 발생하지 않는다. ≤30 은 단일 요청 그대로(무변경 no-op).
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
import { chunk } from "@/lib/utils/chunk";
import type { WatchlistQuote } from "@/lib/api/kis/types";

/** 일괄 시세 정규 모델 — 종목명은 식별 폴백(클라 store 가 표시명 결정). 단일 진실 = `lib/api/kis/types`. */
export type { WatchlistQuote };

/**
 * 요청당 티커 상한 — `/api/watchlist` route 의 `SOFT_CAP` 과 동일값(30). 이보다 많으면 이 크기로
 * 청크 분할해 절단을 피한다. route cap 이 바뀌면 함께 맞춘다(현재는 상수 중복이 안전 — route 는 서버 전용).
 */
export const WATCHLIST_CHUNK_SIZE = 30;

async function fetchQuoteChunk(
  tickers: readonly string[],
): Promise<WatchlistQuote[]> {
  const response = await httpClient.get<WatchlistQuote[]>("/watchlist", {
    params: { tickers: tickers.join(",") },
  });
  return response.data;
}

export async function getWatchlist(
  tickers: readonly string[],
): Promise<WatchlistQuote[]> {
  if (tickers.length === 0) {
    return [];
  }
  // ≤ cap → 단일 요청(무변경). 초과 → cap 단위 청크 병렬 요청 후 청크 순서대로 병합(절단 0).
  if (tickers.length <= WATCHLIST_CHUNK_SIZE) {
    return fetchQuoteChunk(tickers);
  }
  const results = await Promise.all(
    chunk(tickers, WATCHLIST_CHUNK_SIZE).map(fetchQuoteChunk),
  );
  return results.flat();
}
