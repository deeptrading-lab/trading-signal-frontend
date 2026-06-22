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
    /** 종목별 개인/외국인/기관 최근 N일 순매수 추이(투자자 도메인 표면 B). */
    investors: (ticker: string) => ["stock", "investors", ticker] as const,
    /** 종목 "회사 소개"(자유 텍스트, 외부 출처) — 거의 변하지 않는 정적 정보. */
    description: (ticker: string) => ["stock", "description", ticker] as const,
    /** 로컬 AI CLI(claude·codex) 가용성 — AI 분석 진입 화면이 참조. 종목 무관 단일 키. */
    aiProviders: ["stock", "ai-providers"] as const,
    /** 종목별 저장된 최신 AI 분석 결론 — Supabase 공유 저장소 BFF. */
    aiDecision: (ticker: string) => ["stock", "ai-decision", ticker] as const,
    /** 저장된 AI 분석 결론 전체 목록(최신순) + 카드별 토큰 — 분석 결과 화면. 종목 무관 단일 키. */
    aiDecisions: ["stock", "ai-decisions"] as const,
    /** AI 분석 에이전트별 토큰 사용량 집계 — Supabase 이력 BFF. 종목 무관 단일 키. */
    agentUsage: ["stock", "ai-agent-usage"] as const,
  },
  flow: {
    /** 시장 전체 외국인/기관 순매수 Top10(수급 표면 A) — 당일/7일누적 모드별 분리 캐시. */
    top10: (mode: "today" | "cumulative") => ["flow", "top10", mode] as const,
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
    /** CNN(미국) 공포·탐욕 지수 — 단일, 인자 없음. */
    fearGreed: ["market", "fear-greed"] as const,
  },
  watchlist: {
    list: (tickers: readonly string[]) =>
      ["watchlist", "list", normalizeTickers(tickers)] as const,
    /** 관심종목 종목명·메타 (긴 TTL) — 후속 메타 단독 훅 분리 시 참조. */
    info: (tickers: readonly string[]) =>
      ["watchlist", "info", normalizeTickers(tickers)] as const,
  },
  scorecard: {
    /** AI 판정 적중률 집계 — Supabase signal_scorecard BFF. 인자 없는 단일 키. */
    summary: ["scorecard", "summary"] as const,
    /** confidence 버킷별 실측 보정값(scorecard-feedback (가)). 인자 없는 단일 키. */
    calibration: ["scorecard", "calibration"] as const,
  },
} as const;
