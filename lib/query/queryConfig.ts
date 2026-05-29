/**
 * TanStack Query 도메인별 캐싱 TTL 상수.
 *
 * PRD `stock-api-integration` §6.1, §9 q5 [RESOLVED] — 본 PRD 머지 후 1~2주 운영 데이터
 * (`X-Data-Source` 헤더 분포 + KIS 응답 시간) 기반으로 후속 chore PR 에서 조정.
 *
 * 단일 파일에 모아두는 이유:
 *   - 조정 비용 최소 — 도메인 훅마다 매직 넘버 박지 않음.
 *   - reviewer 가 한 번에 검토 가능 (캐싱 정책의 단일 진실 원천).
 *   - 도메인 훅은 `staleTime: queryConfig.stock.price.staleTime` 형태로 참조.
 *
 * staleTime / gcTime 분리:
 *   - staleTime — 이 시간이 지나면 stale 상태로 전환, 다음 mount 또는 focus 시 refetch.
 *   - gcTime — observer 가 0이 된 후 캐시가 메모리에서 garbage collect 될 때까지의 시간.
 *     보통 staleTime 의 5~10배가 합리적이며, gcTime > staleTime 이 의무.
 */

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const queryConfig = {
  stock: {
    /** 현재가 — 실시간성 우선. 매 키 입력마다 호출은 과함. */
    price: {
      staleTime: 10 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /** 일자별 차트 — 장 종료 후 갱신. 장중에는 당일치만 invalidate 필요. */
    daily: {
      staleTime: 1 * DAY,
      gcTime: 7 * DAY,
    },
    /** 종목 검색 — 키워드 변동 적음. */
    search: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
    },
  },
  disclosure: {
    /** 기업개황 — 거의 변하지 않음 (대표자명·설립일·업종 등). */
    company: {
      staleTime: 1 * DAY,
      gcTime: 7 * DAY,
    },
    /** 공시 목록 — 신규 공시 빠른 반영 필요. */
    list: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
    },
  },
  /**
   * PR-C (§3.5) — 도메인 어댑터 TTL.
   * 본 PR 은 인터페이스 + 훅만 신설하고 화면은 mock 유지. 후속 화면 전환 PR 진입 시 동일 TTL 참조.
   *
   * - dashboard.holdings — 보유 종목 multi-price. stock.price 와 동일 실시간성 우선.
   * - market.indices — 시장 지수. 종목 현재가와 동등하게 짧은 TTL.
   * - watchlist.list — 관심종목 multi-price. stock.price 와 동등.
   */
  dashboard: {
    holdings: {
      staleTime: 10 * SECOND,
      gcTime: 5 * MINUTE,
    },
  },
  market: {
    /**
     * 시장 지수 — 실시간성 요구 낮음. KIS `inquire-index-price` rate limit 보호 위해
     * staleTime 30s (PRD `market-real-data` §9 q7=b). 단일 진실 원천.
     */
    indices: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
    },
  },
  watchlist: {
    /**
     * 관심종목 시세 — `inquire-price` 합성. stock.price 와 동등한 짧은 TTL(실시간성).
     * PRD `watchlist-real-data` §3.6.
     */
    list: {
      staleTime: 10 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * 관심종목 종목명·메타 — `search-stock-info`. 거의 변하지 않으므로 긴 TTL
     * (disclosure.company 선례). PRD §9 q2 — 시세와 별도 TTL 분리.
     * 현재 BFF 가 시세와 한 응답으로 합성하지만, 후속 메타 단독 훅 분리 시 본 항목 참조.
     */
    info: {
      staleTime: 1 * DAY,
      gcTime: 7 * DAY,
    },
  },
} as const;

export type QueryConfig = typeof queryConfig;
