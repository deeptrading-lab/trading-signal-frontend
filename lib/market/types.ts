/**
 * 시황(Market-Regime) 레이어 — Phase 1 `MarketSnapshot` 타입.
 *
 * PRD `market-snapshot` §3.1. `GET /api/market/snapshot` 단일 호출이 반환하는 구조화된
 * "시장 스냅샷". 개별 종목이 아니라 **시장 전체 맥락**(주도 섹터·지수 집중도·국면·수급)을 담는다.
 *
 * 모든 계산은 `lib/market/`의 순수함수가 담당하고, route 는 조립만 한다.
 */

/** 지수 1종 — `MarketIndexQuote` 슬림화 + 52주 위치 파생. */
export type IndexBlock = {
  /** 지수 코드("0001"/"1001"/"2001"/"SPX"/"COMP"). */
  code: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  yearHigh?: number;
  yearLow?: number;
  /** 52주 위치 0~1 — (value-yearLow)/(yearHigh-yearLow). 데이터 없으면 생략. */
  pos52w?: number;
  /** 52주 고점 대비 낙폭%(음수 = 고점 아래) — (value-yearHigh)/yearHigh*100. */
  pctFrom52wHigh?: number;
};

/** 시장 폭 — 지수 응답의 상승/하락/보합 종목 수 집계. */
export type BreadthBlock = {
  advances: number;
  declines: number;
  unchanged: number;
  /** adv/(adv+dec) — 0~1. 분모 0 이면 0.5. */
  advanceDeclineRatio: number;
  /** adv/(adv+dec+unch)*100 — "오른 종목 비율"%. */
  breadthPct: number;
};

export type SectorLeader = { ticker: string; name: string; changePct: number };

/** 테마 바스켓 1종의 당일 성과. */
export type SectorPerf = {
  /** 바스켓 키("semiconductor"/"battery"/...). */
  key: string;
  /** 표시 라벨("반도체"/"2차전지"/...). */
  label: string;
  /** 바스켓 등락률% — 시세 확보 종목의 동일가중 평균. */
  changePct: number;
  /** 바스켓 내 상승/하락 종목 수(시세 확보분 기준). */
  upCount: number;
  downCount: number;
  /** 시세를 실제로 확보한 종목 수(바스켓 정의 수와 다를 수 있음 — 부분 성공). */
  memberCount: number;
  /** 등락률 상위 종목 2~3. */
  leaders: SectorLeader[];
  /** 가중 방식 — Phase 1 은 "equal"(동일가중). */
  weightMode: "equal" | "mcap";
};

export type Contributor = {
  ticker: string;
  name: string;
  changePct: number;
  /** 시총 가중치(정규화 전 상대값, baskets.ts 하드코딩). */
  weight: number;
  /** 지수 변동 기여도 ≈ weight × changePct. */
  contribution: number;
};

export type ConcentrationInterpretation = "broad" | "narrow" | "very_narrow";

/**
 * 지수 집중도 — "지수 상승의 몇 %가 소수 대형주(삼성·하이닉스)에서 나왔나".
 * ⚠️ 전체 구성종목 부재 → 시총상위 바스켓 한정 **상대** 집중도(근사). 한계는 snapshot.warnings 에 명시.
 */
export type Concentration = {
  /** 사용한 구성 바스켓 식별("kospi_top_mcap"). */
  basis: string;
  /** 기여 비중 산출 기준 상위 N. */
  topN: number;
  /** 상위 N 의 양(+)기여 비중%(시장 상승분 중 비율). 양기여 총합 0 이면 null. */
  topNContributionPct: number | null;
  /** 바스켓 합산 기여 방향(시장 방향 근사). */
  direction: "up" | "down" | "mixed";
  /** 종목별 기여도 — |contribution| 내림차순. */
  contributors: Contributor[];
  /** 집중도 해석(임계값 분류, 휴리스틱). */
  interpretation: ConcentrationInterpretation;
  /** 바스켓 가중치 기준일(하드코딩 갱신일). */
  asOf: string;
};

export type IndexTrend = "uptrend" | "pullback" | "downtrend" | "neutral";
export type RegimeRiskLevel = "low" | "elevated" | "high";

/** 시장 국면 — 지수(ETF 프록시) 일봉 추세 기반. */
export type RegimeBlock = {
  trend: IndexTrend;
  /** 현재가의 이평 상회 여부(룩백 미확보 시 null). */
  aboveMA: { ma20: boolean | null; ma60: boolean | null; ma120: boolean | null };
  /** MA120 기울기 방향(룩백 미확보 시 null). */
  maSlope120: "up" | "down" | "flat" | null;
  /** 단기 모멘텀%(룩백 미확보 시 null). */
  momentum: { d5: number | null; d20: number | null };
  riskLevel: RegimeRiskLevel;
  rationale: string;
  /** 계산에 사용한 종가 수. */
  bars: number;
};

/** 공포·탐욕 — 0(극단적 공포)~100(극단적 탐욕). */
export type FearGreedBlock = {
  value: number;
  label: string;
  components?: { breadth: number; momentum: number; pos52w: number };
};

export type FlowRow = {
  ticker: string;
  name: string;
  changePercent: number;
  /** 순매수 거래대금(백만원, 부호 보존). */
  netBuyAmount: number;
};

export type FlowBlock = {
  foreignTop: FlowRow[];
  institutionTop: FlowRow[];
};

export type MarketSession = "pre" | "open" | "post" | "closed";
export type MarketDataSource = "live" | "partial" | "mock";

/** `GET /api/market/snapshot` 응답. */
export type MarketSnapshot = {
  /** 생성 시각(ISO, KST 기준). */
  asOf: string;
  /** 장 세션 추정(시각 기반). */
  session: MarketSession;
  /** 데이터 출처 — live(전부 실데이터) / partial(일부 실패) / mock(비-prod). */
  dataSource: MarketDataSource;
  indices: { domestic: IndexBlock[]; overseas: IndexBlock[] };
  breadth: BreadthBlock | null;
  sectors: SectorPerf[];
  concentration: Concentration | null;
  regime: RegimeBlock | null;
  fearGreed: { domestic: FearGreedBlock | null; us: FearGreedBlock | null };
  flow: FlowBlock | null;
  /** 데이터 제한·근사 한계·부분 실패 경고. */
  warnings: string[];
};
