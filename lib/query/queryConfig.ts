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
    /**
     * 현재가 — 실시간성 우선. 매 키 입력마다 호출은 과함. perf: 라우트 재진입 시 재요청 억제 위해
     * 10s→30s 상향(5분 내 재방문 캐시 히트 목표). 조회·분석 전용 스코프라 30s 허용.
     */
    price: {
      staleTime: 30 * SECOND,
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
    /**
     * 종목별 개인/외국인/기관 일자별 순매수 추이(투자자 표면 B) — 일별 데이터, 당일치는 장 종료
     * 후 반영. 실시간성 낮아 staleTime 5min(PRD `investor-flow` §4.B). 단일 진실 원천.
     */
    investors: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
    },
    /** 회사 소개(자유 텍스트) — 분기보고서 주기로 갱신되는 정적 정보. 기업개황과 동일 TTL. */
    description: {
      staleTime: 1 * DAY,
      gcTime: 7 * DAY,
    },
    /**
     * AI 분석 토큰 사용량 집계 — 로컬 분석 실행 시에만 누적되는 이력. 수동 새로고침 + 짧은 stale.
     * 자주 바뀌지 않으나 분석 1회 후 바로 반영되도록 60s.
     */
    agentUsage: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * AI 분석 결론 카드 목록 — 로컬 분석 실행 시에만 갱신되는 공유 결론. 실시간성 낮아 staleTime 60s,
     * 분석 1회 후 재진입 시 바로 반영. agentUsage 와 동일 정책.
     */
    aiDecisions: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
  },
  /**
   * 수급(외국인/기관 순매수) 도메인 TTL.
   *
   * - flow.top10 — 시장 전체 당일 순매수 Top10(표면 A). 당일 가집계가 하루 4~5회라 초단위
   *   폴링 무의미 → staleTime 60s + 재진입 갱신(PRD `investor-flow` §4.A). 단일 진실 원천.
   */
  flow: {
    top10: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * 7일 누적 Top10 — cron 이 하루 1회 적립하므로 장중 재호출 무의미. staleTime 30분
     * (PRD `investor-flow-cumulative` §8.2). 단일 진실 원천.
     */
    cumulative: {
      staleTime: 30 * MINUTE,
      gcTime: 1 * HOUR,
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
   * 도메인 어댑터 TTL.
   * 화면 전환 후속 PR 진입 시 동일 TTL 참조.
   *
   * - profile.holdings — 보유 종목 multi-price. stock.price 와 동일 실시간성 우선.
   *   (home-market-redesign PR1 — dashboard.holdings → profile.holdings 이전.)
   * - market.indices — 시장 지수. 종목 현재가와 동등하게 짧은 TTL.
   * - watchlist.list — 관심종목 multi-price. stock.price 와 동등.
   */
  profile: {
    holdings: {
      staleTime: 30 * SECOND, // perf: stock.price 와 동일 tier — 10s→30s 정합 상향.
      gcTime: 5 * MINUTE,
    },
  },
  market: {
    /**
     * 시장 지수 — 실시간성 요구 낮음. KIS `inquire-index-price` rate limit 보호 위해
     * staleTime 60s (PRD `market-real-data` §9 q7=b 의 30s 를 perf 상 60s 로 상향 — rate-limit
     * 의도 강화 + 라우트 재진입 재요청 억제). 단일 진실 원천.
     */
    indices: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * 헤더 글로벌 마켓 티커 5종 — 거시 표시용 보조 정보. 짧을 필요 없음 →
     * staleTime 120s(PRD `header-market-ticker` §9 q1 의 60s 를 perf 상 상향 — 헤더는 전 라우트
     * 공통이라 재진입 재요청 비용이 큼). BFF 소스별 TTL(국내 30s/해외 10분/BTC 3분)이 실호출 추가 보호.
     */
    ticker: {
      staleTime: 120 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * CNN(미국) 공포·탐욕 지수 — 하루 단위로 의미 있는 지표(장중 소폭 변동). 외부 비공식 출처
     * 부하 최소화 위해 staleTime 30분. 단일 진실 원천.
     */
    fearGreed: {
      staleTime: 30 * MINUTE,
      gcTime: 1 * HOUR,
    },
    /**
     * 거래량 순위 상위 — 단타워치 후보 추천. 실전 전용 랭킹 TR 보호 위해 flow.top10 과 동일하게
     * staleTime 60s + 재진입 갱신. 단일 진실 원천.
     */
    volumeRank: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
  },
  watchlist: {
    /**
     * 관심종목 시세 — `intstock_multprice` 일괄 1콜. 일괄이라 초당 한도 여유 충분 →
     * staleTime 30s 로 상향(지수 `market.indices` 선례). 폴링 없음(수동 새로고침 + staleTime).
     * PRD `watchlist-batch-quotes` §3.3 / §9 q5 RESOLVED.
     */
    list: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
    },
  },
  scorecard: {
    /**
     * AI 판정 적중률 집계 — cron 이 하루 1회 채점하므로 장중 재호출 무의미. 내부 운영자 뷰라
     * 실시간성 낮음 → staleTime 5분 + 수동 새로고침(PRD `signal-scorecard` §3-3-B).
     */
    summary: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
    },
    /**
     * 신뢰도 캘리브레이션 — 채점 누적 통계라 변동 느림. 판정 카드에 곁들이는 보조 정보라
     * 실시간성 불요 → summary 와 동일 정책(staleTime 5분). PRD `scorecard-feedback` §(가).
     */
    calibration: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
    },
  },
  paperTrading: {
    // perf: 5s→30s 상향 — 페이퍼트레이딩 세션은 틱이 분 단위라 5s 폴링 stale 재검증은 과함.
    sessions: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
    },
    session: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
    },
  },
} as const;

export type QueryConfig = typeof queryConfig;
