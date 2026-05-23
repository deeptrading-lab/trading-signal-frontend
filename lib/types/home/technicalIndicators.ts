/**
 * Home 기술적 지표 — RSI / MACD / 볼린저 밴드.
 *
 * 시안 `AnalysisDashboard.tsx` 의 우측 컬럼 정합. `signal` 은 enum 으로 좁혀
 * 카피·색 분기 (`lib/copy/home/labels.ts` + `signal-up/down/warn` 토큰).
 */

export type IndicatorSignal = "BUY" | "SELL" | "NEUTRAL" | "OVERBOUGHT" | "OVERSOLD" | "WATCH";

export type IndicatorKind = "RSI" | "MACD" | "BOLLINGER";

/** 카피 키 — `lib/copy/home/labels.ts` 의 INDICATOR_* 매핑. */
export type IndicatorLabelKey =
  | "INDICATOR_LABEL_RSI"
  | "INDICATOR_LABEL_MACD"
  | "INDICATOR_LABEL_BOLLINGER";

export type IndicatorSignalKey =
  | "INDICATOR_SIGNAL_OVERBOUGHT"
  | "INDICATOR_SIGNAL_BUY"
  | "INDICATOR_SIGNAL_BOLLINGER_UPPER";

export type TechnicalIndicator = {
  kind: IndicatorKind;
  /** 라벨 카피 키. */
  labelKey: IndicatorLabelKey;
  /** 시그널 표시 카피 키. */
  displayKey: IndicatorSignalKey;
  /** 시그널 enum — 색 분기. */
  signal: IndicatorSignal;
  /** RSI 등 0~100 범위 지표의 정량 값 (옵셔널). 게이지 렌더용. */
  value?: number;
};
