/**
 * TanStack Query 의 queryKey 상수 모음.
 *
 * 후속 PRD 화면 컴포넌트가 invalidate/refetch 시 동일 키를 참조할 수 있도록 한 곳에서 관리한다.
 *
 * `docs/rules/frontend.md` §7 — query key 는 본 파일 한 곳에 모은다. 컴포넌트·도메인 훅에서
 * 인라인 배열 리터럴로 키를 만들지 않는다.
 *
 * PRD `stock-api-integration` §3.4 — stock + disclosure 도메인 키 추가.
 *   - 함수형 빌더는 도메인 훅이 동일 시그니처로 호출 + invalidate.
 *   - `as const` 로 readonly tuple 강제 → typo 회귀 차단.
 *
 * PR-C (§3.5) — profile(계좌) / market / watchlist 도메인 어댑터 키 추가.
 *   (home-market-redesign PR1 — dashboard 도메인 → profile 도메인 이전.)
 *   - 화면 컴포넌트는 본 PR 에서 mock 그대로 유지하지만, 후속 PR 들이 한 도메인씩 mock → 훅 전환
 *     시 동일 factory 를 참조하기 위해 미리 정착.
 *   - tickers 배열은 readonly tuple 안정성을 위해 `.slice().sort()` 정규화 후 join → 순서 무관 캐시.
 */

function normalizeTickers(tickers: readonly string[]): string {
  return tickers.slice().sort().join(",");
}

export const queryKeys = {
  whitelist: (q: string) => ["whitelist", "search", q] as const,
  analyze: ["workbench", "analyze"] as const,
  stock: {
    price: (ticker: string) => ["stock", "price", ticker] as const,
    daily: (ticker: string, period: "D" | "W" | "M") =>
      ["stock", "daily", ticker, period] as const,
    chart: (ticker: string, period: string, days: number) =>
      ["stock", "chart", ticker, period, days] as const,
    search: (keyword: string) => ["stock", "search", keyword] as const,
  },
  disclosure: {
    company: (ticker: string) => ["disclosure", "company", ticker] as const,
    list: (ticker: string, count: number) =>
      ["disclosure", "list", ticker, count] as const,
  },
  profile: {
    holdings: (tickers: readonly string[]) =>
      ["profile", "holdings", normalizeTickers(tickers)] as const,
  },
  market: {
    indices: (codes: readonly string[]) =>
      ["market", "indices", normalizeTickers(codes)] as const,
    /** 헤더 글로벌 마켓 티커 5종 — 합성 BFF, 인자 없음. */
    ticker: ["market", "ticker"] as const,
  },
  watchlist: {
    list: (tickers: readonly string[]) =>
      ["watchlist", "list", normalizeTickers(tickers)] as const,
    /** 관심종목 종목명·메타 (긴 TTL) — 후속 메타 단독 훅 분리 시 참조. */
    info: (tickers: readonly string[]) =>
      ["watchlist", "info", normalizeTickers(tickers)] as const,
  },
} as const;
