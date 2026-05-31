/**
 * Market 도메인 어댑터 — 시장 지수 조회.
 *
 * PRD `market-real-data` §3.4 — `/api/stock/price` 반복 호출 임시 구현을 제거하고
 * 전용 BFF `/api/market/indices` 단일 호출로 재배선.
 *
 * 인터페이스:
 *   `getMarketIndices(codes?: readonly string[]): Promise<MarketIndexQuote[]>`
 *   - codes 기본값 = `DEFAULT_INDEX_CODES` (국내 3종: KOSPI 0001 / KOSDAQ 1001 / KOSPI200 2001).
 *   - 빈 배열 입력 시 호출 없이 즉시 빈 배열.
 *
 * 브라우저 → 본 어댑터(httpClient, same-origin `/api`) → BFF route → KIS 단방향.
 * KIS 직접 호출(`getKisClient`/`fetchIndexPrice`)은 본 어댑터에서 절대 import 하지 않는다 (AC-3).
 * 응답은 이미 `MarketIndexQuote[]` 클라이언트 친화 스키마 (BFF 의 `mapIndexPrice` 가 책임).
 *
 * 부분 성공: BFF 가 `Promise.allSettled` 로 성공분만 반환하므로 결과 길이가 codes 보다 짧을 수 있다.
 */

import { httpClient } from "@/lib/api/client";
import type { MarketIndexQuote } from "@/lib/api/kis/types";

export type { MarketIndexQuote } from "@/lib/api/kis/types";

/** 기본 시장 지수 코드 — 국내 2종(KOSPI / KOSDAQ) + 해외 2종(S&P 500 / NASDAQ). */
export const DEFAULT_INDEX_CODES = ["0001", "1001", "SPX", "COMP"] as const;

export async function getMarketIndices(
  codes: readonly string[] = DEFAULT_INDEX_CODES,
): Promise<MarketIndexQuote[]> {
  if (codes.length === 0) {
    return [];
  }
  const response = await httpClient.get<MarketIndexQuote[]>("/market/indices", {
    // 반복 파라미터 ?codes=0001&codes=1001 — BFF 가 getAll 로 수집.
    params: { codes: [...codes] },
    paramsSerializer: {
      indexes: null, // codes[]=... 가 아닌 codes=... 반복 형태로 직렬화.
    },
  });
  return response.data;
}
