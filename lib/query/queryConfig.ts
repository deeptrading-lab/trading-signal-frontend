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
 *     staleTime 은 "신선도", gcTime 은 "힙 체류 상한" — 서로 다른 축이라 gcTime > staleTime
 *     의무 같은 건 없다. 대용량 도메인(일봉 캔들 배열 등)은 gcTime < staleTime 으로 짧게 잡아
 *     메모리를 회수하고, gc 후 재방문은 refetch 1회 비용과 교환한다(mobile-perf-memory —
 *     방문 종목마다 캔들 배열이 힙에 7일 잔류해 모바일 탭 킬에 기여하던 것을 하향).
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
    /**
     * 일자별 차트 — 장 종료 후 갱신. 장중에는 당일치만 invalidate 필요.
     * gcTime 7일 → 30분(mobile-perf-memory): 종목당 최대 ~3000봉 × 파생 15필드 배열이라
     * 세션 중 방문한 모든 종목이 힙에 7일 잔류 → 모바일 탭 킬의 주요 벡터였다. 세션 내
     * 재방문(뒤로가기·peek 재호버)은 30분이면 충분하고, 이후엔 refetch 1회로 복구.
     */
    daily: {
      staleTime: 1 * DAY,
      gcTime: 30 * MINUTE,
    },
    /** 당일 분봉(단타워치 차트 탭) — 장중 1분 주기 갱신은 훅의 refetchInterval 이 담당. */
    minuteChart: {
      staleTime: 45 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * 매수 유의사항(시장경보·VI) — 지정 계열은 일배치라 길어도 되지만 VI(실시간 계열)
     * 신선도 기준 60s(서버 로더 캐시와 동일). 장중 자동 갱신은 훅 refetchInterval 담당.
     */
    warnings: {
      staleTime: 1 * MINUTE,
      gcTime: 10 * MINUTE,
    },
    /**
     * 호가창(매수/매도 잔량) — 초 단위로 변하는 순간 수급. staleTime 3s(서버 로더 성공 캐시와
     * 정렬). 장중 갱신은 지면별 refetchInterval(단타 3s·상세 10s)이 담당, 백그라운드 탭은 정지.
     */
    orderbook: {
      staleTime: 3 * SECOND,
      gcTime: 1 * MINUTE,
    },
    /**
     * 최근 체결(체결강도 + 체결 테이프) — 호가와 동일하게 초 단위로 변하는 순간 수급. staleTime 3s
     * (서버 로더 성공 캐시와 정렬). 장중 갱신은 지면별 refetchInterval(단타 3s·상세 10s)이 담당,
     * 백그라운드 탭은 정지.
     */
    trades: {
      staleTime: 3 * SECOND,
      gcTime: 1 * MINUTE,
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
    /**
     * 회사 소개(자유 텍스트) — 분기보고서 주기로 갱신되는 정적 정보. 기업개황과 동일 TTL.
     * gcTime 7일 → 1시간(mobile-perf-memory): 건당 텍스트가 커 방문 종목 누적 힙 회수.
     */
    description: {
      staleTime: 1 * DAY,
      gcTime: 1 * HOUR,
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
     * A/B 토큰 최적화 리포트 — 실험 실행 후 수동 새로고침으로 확인하는 운영자 뷰.
     * usage 와 동일하게 짧은 stale 을 둬 방금 끝난 run 이 빠르게 반영되게 한다.
     */
    abHarnessReport: {
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
    /**
     * 기업개황 — 거의 변하지 않음 (대표자명·설립일·업종 등).
     * gcTime 7일 → 1시간(mobile-perf-memory): description 과 동일 축 힙 회수.
     */
    company: {
      staleTime: 1 * DAY,
      gcTime: 1 * HOUR,
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
     * 국내 장 캘린더 — 하루 단위로 사실상 정적(영업일 여부·세션 경계는 하루 안 바뀜).
     * 서버 로더가 15분 캐시라 쿼리 staleTime 도 길게(30분) + 폴링 없음. phase 만 시간 경과로
     * 바뀌는데, 이는 네트워크 재요청이 아니라 `useMarketStatus` 훅의 세션 경계 재평가가 담당한다.
     */
    calendar: {
      staleTime: 30 * MINUTE,
      gcTime: 1 * HOUR,
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
     * 거래량/거래대금 순위 상위 — 단타워치 후보·실시간 랭킹. 실전 전용 랭킹 TR 보호 위해
     * flow.top10 과 동일하게 staleTime 60s + 재진입 갱신. 단일 진실 원천.
     */
    volumeRank: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * 등락률 순위(급상승/급하락) — 실시간 랭킹 탭. 시세성 랭킹이라 volumeRank/flow.top10 과
     * 동일 tier(staleTime 60s + 재진입 갱신). 실전 전용 TR 보호. 단일 진실 원천.
     */
    fluctuation: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * 업종 등락 랭킹("지금 뜨는 산업") — 카테고리 단건 + 상위 N breadth fan-out. 실전 전용 TR 보호 +
     * fan-out 콜 억제 위해 volumeRank/fluctuation 과 동일 tier(staleTime 60s + 재진입 갱신, 폴링 없음).
     */
    sectorRanking: {
      staleTime: 60 * SECOND,
      gcTime: 5 * MINUTE,
    },
    /**
     * 업종 구성종목 — 모달 열릴 때만 조회(훅 enabled). 열람 신선도로 충분해 staleTime 30s + 폴링 없음.
     */
    sectorConstituents: {
      staleTime: 30 * SECOND,
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
  intraday: {
    /**
     * 틱 자가채점 라벨 집계 — 라벨링 실행/세션 완료 시에만 변한다. 실행 후 invalidate 가
     * 갱신을 담당하므로 staleTime 은 넉넉히(scorecard summary 와 동일 정책).
     */
    tickLabelSummary: {
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
    /**
     * 장중 세션 목록 폴링 주기 — 새 세션(오토파일럿 스윕·타 서버·봇)이 화면에 뜨기까지의 지연 상한.
     * 판단 자체가 5분 주기라 30초면 체감 지연이 없다.
     */
    sessionsPollMs: 30 * SECOND,
    /**
     * 장외·주말 세션 목록 폴링 주기 — **끄지 않는다**. 프리마켓 세션 생성·15:40 자동 완료·크로스데이
     * 스윕이 이 시간대에도 상태를 바꾸고, 끄면 그 시간대엔 "새로고침해야 보임"이 그대로 남는다.
     */
    sessionsIdlePollMs: 2 * MINUTE,
    /** 장중 세션 상세(판단·체결) 폴링 주기 — 종료 세션은 폴링하지 않는다. */
    sessionPollMs: 30 * SECOND,
    /**
     * 과거 내역 페이지 — 이미 끝난 세션 원장이라 장중 재검증이 무의미하다. 페이지를 누적하는
     * 무한 쿼리라 재요청 억제(staleTime)·캐시 보존(gcTime) 둘 다 길게 잡는다.
     */
    sessionHistory: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
    },
    /** 오토파일럿 런 — 스윕이 10분 주기라 30s 신선도면 슬롯·로그가 늦지 않게 보인다. */
    autopilot: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
    },
  },
  auth: {
    /**
     * 현재 세션 role(표시용) — 세션 수명 내 사실상 불변(승인/역할 변경은 재로그인 필요). 재조회 부담을
     * 줄이려 staleTime 길게(30분). 표시용이라 실시간성 불요(PRD `market-status-aware-home` §3-5).
     */
    me: {
      staleTime: 30 * MINUTE,
      gcTime: 1 * HOUR,
    },
  },
} as const;

export type QueryConfig = typeof queryConfig;
