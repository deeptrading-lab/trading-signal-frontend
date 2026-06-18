/**
 * 경량 종목 스냅샷 도메인 모델 — `GET /api/stock/snapshot` 응답 스키마.
 *
 * PRD `value-picks-validated` §3-A-2 (1차 — KIS 파생 지표만).
 * (docs/prd/value-picks-validated.md, dev-manager-bot 레포)
 *
 * value_picks 봇이 후보 종목별로 1회 호출해 **밸류트랩 룰**(유동성·수급추세·추세레짐)을 돌릴
 * 결정적·저비용 read 스냅샷. 여러 read 엔드포인트(`/price`·`/chart`·`/investors`)의 KIS 호출을
 * 조합해 한 번에 반환한다.
 *
 * ## ⚠️ 단위·null 규약
 *
 * - 모든 수치는 **산출 불가 시 `null`**(필드 생략 아님). 봇 룰이 null 을 "판정 보류"로 처리.
 * - 금액(`*KRW`)은 **원(KRW)** 단위. 수급 순매수는 KIS 가 백만원으로 주므로 BFF 가 ×1,000,000 환산.
 * - `tradeAmountKRW = current * volume`(파생). `marketCapKRW = current * lstn_stcn`(상장주수).
 *
 * ## 2차 확장 여지 (§7-2)
 *
 * 재무비율(PER/PBR/ROE/배당/이익성장)은 KIS 미제공 → 2차 후속 PRD. 본 스키마는 최상위 객체 확장이
 * 쉽도록(예: 미래 `fundamentals` 블록 추가) 평면 구조를 유지한다.
 */

/** 시장 구분 — 1차는 KOSPI/KOSDAQ 한정(그 외/미상 = null). */
export type SnapshotMarket = "KOSPI" | "KOSDAQ" | null;

/** 추세 레짐 — `lib/signal/regime.ts` computeRegime(1/0/-1) → 문자열 매핑. */
export type SnapshotTrendRegime = "up" | "side" | "down" | null;

/** 시세 블록 — `/price`(inquire-price) 파생. */
export type SnapshotPrice = {
  /** 현재가(원). */
  current: number;
  /** 전일 대비율(%). */
  changePercent: number;
  /** 당일 누적 거래량(주). */
  volume: number;
  /** 일거래대금(원) = current × volume. 유동성 함정 판정 핵심. */
  tradeAmountKRW: number;
};

/** 52주 위치 블록 — 일봉에서 산출. 봉 부족 시 각 필드 null. */
export type SnapshotValuation52w = {
  /** 52주 고가(원) | null. */
  high: number | null;
  /** 52주 저가(원) | null. */
  low: number | null;
  /** 52주 위치(%) = (current-low)/(high-low)×100 | null. */
  positionPct: number | null;
};

/** 기술적 지표 블록 — 일봉 + technicalIndicators/regime 산출. 데이터 부족 시 각 필드 null. */
export type SnapshotTechnical = {
  /** 단순이평(원) | null. */
  sma5: number | null;
  sma20: number | null;
  sma60: number | null;
  /** RSI(0~100) | null. */
  rsi14: number | null;
  /** ADX 추세강도 | null. */
  adx14: number | null;
  /** N일(기본 20영업일) 모멘텀(%) | null. */
  momentumPct: number | null;
  /** current >= sma20 | null. */
  aboveSma20: boolean | null;
  /** current >= sma60 | null. */
  aboveSma60: boolean | null;
  /** sma5 가 sma20 을 하향 돌파(최근 발생) | null. */
  deadCross: boolean | null;
  /** 추세 레짐 | null. */
  trendRegime: SnapshotTrendRegime;
};

/** 수급추세 블록 — `/investors`(inquire-investor) N일 집계. */
export type SnapshotInvestorTrend = {
  /** 집계 기간(영업일). */
  lookbackDays: number;
  /** 기관 N일 합산 순매수(원, 음수=순매도) | null. */
  orgNetBuyAmountKRW: number | null;
  /** 외국인 N일 합산 순매수(원) | null. */
  foreignNetBuyAmountKRW: number | null;
  /** 기관 연속 순매도 일수(최근 기준) | null. */
  orgConsecutiveSellDays: number | null;
  /** 외국인 연속 순매도 일수 | null. */
  foreignConsecutiveSellDays: number | null;
};

/** 종목 스냅샷 — BFF 가 반환하는 최상위 형태. */
export type StockSnapshot = {
  ticker: string;
  /** 표시용 종목명(없으면 ticker 폴백). */
  name: string;
  /** 시장 구분 | null. */
  market: SnapshotMarket;
  /** 데이터 기준 시각(ISO8601, KST). */
  asOf: string;
  price: SnapshotPrice;
  valuation52w: SnapshotValuation52w;
  /** 시가총액(원) = current × lstn_stcn | null. */
  marketCapKRW: number | null;
  /** 외국인 지분율(%) | null. */
  foreignRatioPct: number | null;
  technical: SnapshotTechnical;
  investorTrend: SnapshotInvestorTrend;
};
