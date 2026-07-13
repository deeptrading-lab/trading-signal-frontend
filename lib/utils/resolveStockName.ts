/**
 * 종목 표시명 선택 — 후보(candidates) 중 첫 번째 "비어있지 않고 ticker 자체가 아닌" 값.
 * 모두 부적합하면 `null`(최종 ticker 폴백 여부는 호출부가 결정).
 *
 * 종목명 출처는 화면마다 다르다: watchlist store(`useWatchlistTickers.getName`) · 최근검색
 * (`recentSearch`) · KIS 응답명 · 시세(`quote.name`). 시드명(`getSymbolName`)은 서버 전용
 * (BFF 가 응답에 보강, mobile-perf-bundle) — 클라 candidate 로 쓰지 않는다. 출처 우선순위는
 * 호출부가 `candidates` 순서로 정하고, 본 함수는 선택 규칙(빈 값/티커 동일값 스킵)만 단일화한다.
 *
 * 사용:
 *   - StockHeader:        `pickStockName(t, [getName(t), recentName, apiName]) ?? t`
 *   - StockSearch(관심):  `pickStockName(t, [getName(t), quote?.name]) ?? t`
 *   - WatchlistContainer: `pickStockName(t, [getName(t), stockQuotes[t]?.name])`  // null 유지(디그레이드 행)
 *
 * Phase 2(zustand stock-meta) 도입 시 store 의 last-known name 도 candidate 로 추가하면 된다.
 */
export function pickStockName(
  ticker: string,
  candidates: Array<string | null | undefined>,
): string | null {
  for (const c of candidates) {
    if (c && c !== ticker) return c;
  }
  return null;
}
