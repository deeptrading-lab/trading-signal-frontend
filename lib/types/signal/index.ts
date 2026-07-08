/**
 * 시그널 규칙 엔진 타입 — `lib/signal/` 순수 모듈의 입출력 계약.
 *
 * 설계: 추세·모멘텀·거래량·변동성 4축을 각각 점수화 → 가중합 → 종합점수 + BUY/HOLD/SELL.
 * 엔진은 순수(데이터 출처 무관) — 입력은 `StockDailyCandle[]`(오름차순), 출력은 `SignalResult`.
 *
 * 참고: 종목 상세 enum `lib/types/home/technicalIndicators.ts` 의 BUY/SELL/NEUTRAL 어휘와 정합.
 */

/** 매매 신호 — 방향 점수의 밴드 매핑. 고=매수 / 저=매도(이탈). */
export type SignalAction = "BUY" | "HOLD" | "SELL";

/** 4개 판단 축. */
export type AxisKey = "trend" | "momentum" | "volume" | "volatility";

/** 규칙 발화 방향 — +1 강세 / 0 중립 / -1 약세. */
export type RuleDirection = 1 | 0 | -1;

/**
 * 발화된 규칙 1건 — "왜 이 신호인지"의 최소 단위.
 * 백테스트 attribution 이 `key` 로 규칙별 예측력을 집계한다.
 */
export type RuleHit = {
  /** 규칙 식별자 — "MA_GOLDEN_CROSS", "RSI_OVERSOLD" 등 (`lib/copy/signal/labels.ts` 매핑). */
  key: string;
  axis: AxisKey;
  direction: RuleDirection;
  /** 축 내 기여 가중치 (>0). */
  weight: number;
  /** 수치 컨텍스트 — "RSI 28.4", "거래량 2.1배" 등 표시·디버그용. */
  detail?: string;
};

/** 한 축의 집계 결과. */
export type AxisScore = {
  axis: AxisKey;
  /** 0~100 정규화 점수 (50=중립). */
  score: number;
  /** 축 순방향 — 발화 규칙 가중합의 부호. */
  direction: RuleDirection;
  hits: RuleHit[];
};

/** 엔진 최종 출력. */
export type SignalResult = {
  action: SignalAction;
  /** 0~100 종합 점수 (축 가중평균). */
  score: number;
  /** 0~1 동의도 — 종합 방향에 동의하는 축 비율. */
  confidence: number;
  axes: AxisScore[];
  /** 평가 기준 봉 날짜 (마지막 캔들, YYYY-MM-DD). */
  asOf: string;
  /** 지표 계산에 충분한 봉 수였는지(>= SOFT_MIN_BARS). false 면 action=HOLD 안전 폴백(분석 차단). */
  warmupOk: boolean;
  /**
   * 장기추세 미확보 여부 — SOFT_MIN_BARS(90) ≤ bars < MIN_BARS(130) 면 true.
   * true 면 120일선·정배열·레짐이 미확보돼 결론의 불확실성이 크다(분석은 정상 제공하되 경고·confidence 캡 동반).
   * false 면 풀 품질(bars >= MIN_BARS) 또는 하드 폴백(bars < SOFT_MIN_BARS — 평가 자체를 안 함).
   */
  limitedData: boolean;
  /** 평가에 쓴 캔들 수(n). 로깅·디버그·QA 재현·프롬프트 경고 주입용. */
  bars: number;
  /**
   * 장기추세 레짐 — +1 강세(120일선 우상향+가격 위) / -1 약세 / 0 중립.
   * 약세 레짐에서 BUY 는, 강세 레짐에서 SELL 은 HOLD 로 veto(추세 역행 진입 차단).
   */
  regime: RuleDirection;
};

/**
 * 타임프레임 인식 지표 주기 프로파일 — 미지정 필드는 일봉 기본 상수(`weights.ts`/지표 함수 기본값).
 *
 * 분봉은 일봉 보정 주기(MA 5/20/60/120, MACD 12/26/9 등)가 의미를 잃으므로 캘러가 주기를 주입한다.
 * 지표 **임계값**(RSI 30/70·거래량 1.5배·ADX 25 등 무차원 상수)은 그대로 두고 **주기만** 바꾼다
 * (1차 컷 — 차원 있는 MA/지표 길이가 타임프레임 변경에 가장 민감하다).
 */
export type IndicatorProfile = {
  /** 이동평균 기간 (short/mid/long/base). */
  maPeriods?: { short: number; mid: number; long: number; base: number };
  /** MACD fast/slow/signal. */
  macd?: { fast: number; slow: number; signal: number };
  /** RSI 기간. */
  rsiPeriod?: number;
  /** 볼린저 기간/표준편차 배수. */
  bollinger?: { period: number; mult: number };
  /** ADX 기간. */
  adxPeriod?: number;
  /** 거래량 이동평균 기간. */
  volumeMaPeriod?: number;
};

/** 엔진 튜닝 옵션 (미지정 시 `weights.ts` 기본값). */
export type EvaluateOptions = {
  /** 축 가중치 (합 1 권장). */
  axisWeights?: Record<AxisKey, number>;
  /** BUY 진입 종합점수 하한 (기본 60). */
  buyThreshold?: number;
  /** SELL 진입 종합점수 상한 (기본 40). */
  sellThreshold?: number;
  /** 장기추세 레짐 필터 적용 여부 (기본 true). 역추세 진입 veto. */
  regimeFilter?: boolean;
  /**
   * 타임프레임 인식 지표 주기 — 분봉 프로파일. 미지정 시 일봉 기본(무회귀).
   */
  indicators?: IndicatorProfile;
  /**
   * 레짐 외부 주입 — 분봉은 자체 SMA120 레짐이 오버나잇 갭에 오염되므로
   * 일봉 SMA 기울기로 산출한 레짐(-1/0/1)을 주입해 veto 판단에 쓴다. 미지정 시 내부 `computeRegime`.
   */
  regimeOverride?: RuleDirection;
  /** warmup 차단 최소 봉수 오버라이드 (분봉 프로파일). 미지정 시 `SOFT_MIN_BARS`(90). */
  softMinBars?: number;
  /** 풀 품질 최소 봉수 오버라이드 (분봉 프로파일). 미지정 시 `MIN_BARS`(130). */
  minBars?: number;
  /**
   * 저점 우상향/고점 우하향(구조 반전 임박) 판정용 스윙 룩백 오버라이드 — 분봉 프로파일은
   * `structureLookback` 을 그대로 재사용해 일봉 기본값(30봉)이 분봉 타임프레임에 맞지 않는
   * 문제를 막는다. 미지정 시 `HIGHER_LOW_LOOKBACK`(30).
   */
  trendHigherLowLookback?: number;
  /**
   * 축 대체 주입 — 인트라데이 graded 축(거래량 z-score·VWAP σ-거리)이 이진 임계 축
   * (volume/volatility)을 composite **직전**에 교체한다(PRD intraday-decision-overhaul PR-1b).
   * 점수·액션·동의도가 교체 축으로 계산되고 `axes` 로도 교체본이 반환된다.
   * 미지정/빈 객체 = 비트 동일(무회귀) — 일봉 경로는 사용하지 않는다.
   */
  axisOverrides?: Partial<Record<AxisKey, AxisScore>>;
};

// ───────────────────────── 백테스트 ─────────────────────────

/** Triple Barrier 라벨 — 익절/손절/시간만료. */
export type BarrierLabel = "WIN" | "LOSS" | "NEUTRAL";

/**
 * Triple Barrier 배리어 모드.
 * - `"atr"` (기본): ATR 배수 / 명시 % 기반 고정 폭.
 * - `"structure"`: 매물대(Volume Profile) + 박스권(Swing H/L) + MA 손절 기반 절대가 결정.
 *   구조적 TP/SL을 찾지 못하면 ATR 비대칭(TP 3× / SL 1.5×)으로 자동 폴백.
 */
export type BarrierMode = "atr" | "structure";

/** Triple Barrier 파라미터. */
export type BarrierOptions = {
  /** 배리어 결정 방식. 기본 "atr". */
  mode?: BarrierMode;
  /** 향후 평가 기간(영업일). 기본 20. */
  horizonDays?: number;

  // ── ATR 모드 ──
  /** 익절 폭(%) — 미지정 시 ATR 배수 사용. */
  tpPct?: number;
  /** 손절 폭(%) — 미지정 시 ATR 배수 사용. */
  slPct?: number;
  /** ATR 배수(양쪽 공통) — tpPct/slPct 미지정 시 변동성 적응 배리어. 기본 2. */
  atrMult?: number;
  /** 익절 ATR 배수(비대칭) — 지정 시 atrMult 대신 익절에 적용. winner-run 용. */
  tpAtrMult?: number;
  /** 손절 ATR 배수(비대칭) — 지정 시 atrMult 대신 손절에 적용. cut-loss 용. */
  slAtrMult?: number;

  // ── Structure 모드 ──
  /** 매물대·스윙 계산 룩백 봉 수. 기본 STRUCTURE_LOOKBACK(60). */
  lookbackBars?: number;
  /** Volume Profile 구간 수. 기본 STRUCTURE_BINS(40). */
  profileBins?: number;
  /** 스윙 피벗 검출 윈도우(양방향). 기본 STRUCTURE_SWING_WINDOW(3). */
  swingWindow?: number;
  /** MA 손절 기간(0=비활성). 기본 STRUCTURE_MA_STOP(20). */
  maStopPeriod?: number;
  /** 최소 보상:위험 비율 — 미충족 시 ATR 폴백. 기본 STRUCTURE_MIN_RRR(1.5). */
  minRRR?: number;
};

/**
 * 진입 정책.
 * - `everyBar`: 신호(BUY/SELL)가 뜬 모든 봉에서 진입(기존 — 과다 진입, 롱 편향).
 * - `trigger`: 강한 트리거(교차·거래량 급증)가 발화 + 4축 컨플루언스 + 쿨다운 충족 시에만 진입(선별).
 */
export type EntryMode = "everyBar" | "trigger";

export type EntryOptions = {
  mode?: EntryMode;
  /** 진입 후 재진입 금지 기간(봉). 기본 DEFAULT_COOLDOWN_DAYS. */
  cooldownDays?: number;
};

/** 한 시점 신호 1건의 백테스트 결과. */
export type BacktestTrade = {
  /** 진입 봉 날짜. */
  date: string;
  action: SignalAction;
  score: number;
  entryPrice: number;
  label: BarrierLabel;
  /** 청산 시점 수익률(%) — 부호 포함. */
  returnPct: number;
  /** 이 신호에 발화됐던 규칙 키 — attribution 집계용. */
  ruleKeys: string[];
};

/** 백테스트 집계 지표. */
export type BacktestMetrics = {
  /** 표본 수 (BUY+SELL 신호). */
  trades: number;
  /** 적중률 = WIN / (WIN+LOSS). */
  hitRate: number;
  /** 손익비 = 총이익 / 총손실 (절대값). */
  profitFactor: number;
  /** 평균 수익률(%). */
  avgReturnPct: number;
  /** 최대 낙폭(%) — 신호 순서 누적 수익 기준. */
  maxDrawdownPct: number;
  /** WIN/LOSS/NEUTRAL 카운트. */
  wins: number;
  losses: number;
  neutrals: number;
};

/** 규칙별 예측력 — "어느 기준이 실제로 맞는가". 보정 루프의 근거. */
export type RuleAttribution = {
  key: string;
  /** 이 규칙이 발화된 신호 수. */
  count: number;
  hitRate: number;
  avgReturnPct: number;
};

/** 백테스트 전체 리포트. */
export type BacktestResult = {
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  /** 규칙별 집계 — hitRate 오름차순(저성과·역예측 규칙이 위). */
  attribution: RuleAttribution[];
};
