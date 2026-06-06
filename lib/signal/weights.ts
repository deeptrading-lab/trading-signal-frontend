/**
 * 시그널 엔진 튜닝 상수 — **단일 위치**.
 *
 * 백테스트 attribution 으로 저성과·역예측 규칙을 찾으면 여기 가중치/임계값만 고쳐 보정한다.
 * (보정 루프: 베이스라인 → attribution → 본 파일 수정 → 재실행 비교)
 */

import type { AxisKey } from "@/lib/types/signal";

/** 축 가중치 (합 1). 추세 우선 — 큰 흐름이 모멘텀·거래량보다 신뢰도 높다는 통념. */
export const AXIS_WEIGHTS: Record<AxisKey, number> = {
  trend: 0.35,
  momentum: 0.3,
  volume: 0.2,
  volatility: 0.15,
};

/** 종합점수 밴드 — 이상이면 BUY, 이하면 SELL, 사이는 HOLD. */
export const BUY_THRESHOLD = 60;
export const SELL_THRESHOLD = 40;

/** 120일선 + 워밍업 여유. 미만이면 warmupOk=false → HOLD 폴백. */
export const MIN_BARS = 130;

/** 이동평균 기간. */
export const MA_PERIODS = { short: 5, mid: 20, long: 60, base: 120 } as const;

/** 축별 점수 정규화 스케일 — net 가중합을 ±scale 에서 0~100 으로 클램프. */
export const AXIS_SCALE: Record<AxisKey, number> = {
  trend: 11,
  momentum: 9,
  volume: 3,
  volatility: 2,
};

/**
 * 축 내 규칙 가중치.
 *
 * 보정 이력(2026-06-06, 3종목 3년 백테스트): 평균회귀 매수 규칙(볼린저 하단 터치·RSI 과매도)이
 * 3종목 전부 음(-)의 평균수익(역예측 = 떨어지는 칼날)으로 확인 → 추세추종(MACD 교차·골든크로스·
 * 거래량 급증)은 일관 우수. 따라서 mean-reversion 계열(bollTouch·rsiExtreme) 가중을 하향.
 */
export const RULE_WEIGHTS = {
  maAligned: 4,
  pricePosition: 2,
  maCross: 3,
  adxRegime: 2,
  macdCross: 3,
  macdHist: 1.5,
  macdZero: 1,
  rsiExtreme: 1.5, // was 2 — 과매도 매수 평균회귀 약화(백테스트 역예측)
  rsiMid: 1.5,
  volumeSurge: 3,
  bollTouch: 1, // was 2 — 하단 터치 반등 가정이 한국 일봉서 역예측, 최소화
} as const;

/** 임계값. */
export const RSI_OVERSOLD = 30;
export const RSI_OVERBOUGHT = 70;
/** 거래량 급증 판정 배수 (당일/20일MA). */
export const VOLUME_SURGE_MULT = 1.5;
/** 거래량 위축 판정 배수. */
export const VOLUME_DRY_MULT = 0.7;
/** ADX 추세 강함/약함 경계. */
export const ADX_TREND = 25;
export const ADX_WEAK = 20;
/** 볼린저 밴드폭 스퀴즈 임계(작을수록 변동성 수축). */
export const BOLL_SQUEEZE_BW = 0.1;

/** 레짐 게이트 — 추세 역방향 모멘텀 신호 가중 감쇠 계수(0.5=절반). */
export const REGIME_DAMPEN = 0.5;
