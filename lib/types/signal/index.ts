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
  /** 지표 계산에 충분한 봉 수였는지. false 면 action=HOLD 안전 폴백. */
  warmupOk: boolean;
  /**
   * 장기추세 레짐 — +1 강세(120일선 우상향+가격 위) / -1 약세 / 0 중립.
   * 약세 레짐에서 BUY 는, 강세 레짐에서 SELL 은 HOLD 로 veto(추세 역행 진입 차단).
   */
  regime: RuleDirection;
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
};

// ───────────────────────── 백테스트 ─────────────────────────

/** Triple Barrier 라벨 — 익절/손절/시간만료. */
export type BarrierLabel = "WIN" | "LOSS" | "NEUTRAL";

/** Triple Barrier 파라미터. */
export type BarrierOptions = {
  /** 향후 평가 기간(영업일). 기본 20. */
  horizonDays?: number;
  /** 익절 폭(%) — 미지정 시 atrMult 사용. */
  tpPct?: number;
  /** 손절 폭(%) — 미지정 시 atrMult 사용. */
  slPct?: number;
  /** ATR 배수 — tpPct/slPct 미지정 시 변동성 적응 배리어. 기본 2. */
  atrMult?: number;
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
