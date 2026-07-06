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

/**
 * 풀 데이터 기준 봉수 — 120일선 + 레짐 기울기(140봉 룩백 여유)까지 전부 확보되는 경계.
 * 이상이면 limitedData=false(풀 품질). SOFT_MIN_BARS 이상~MIN_BARS 미만은 limitedData=true
 * (장기추세·레짐 일부 미확보)로 분석을 제공한다. (과거: "미만이면 분석 차단"이었으나
 * 신규 상장주 분석 사각지대 해소를 위해 차단 경계는 SOFT_MIN_BARS 로 분리.)
 */
export const MIN_BARS = 130;

/**
 * 분석 제공 최소 봉수 — 90~130 구간은 limitedData(장기추세 미확보)로 진행.
 * 미만이면 warmupOk=false → HOLD 안전 폴백(분석 차단). 90봉이면 5/20/60 이평·골든크로스·
 * MACD·RSI·볼린저·ADX 가 확보돼 단기·중기 신뢰가 가능하다(SMA120·정배열·레짐은 미확보).
 */
export const SOFT_MIN_BARS = 90;

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
  macdConverge: 1,
  higherLowBase: 2,
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

/** MACD 히스토그램 수렴(반전 임박) 판정 룩백 봉수 — 최근 N봉 |histogram| 이 단조 감소인지 확인. */
export const MACD_CONVERGE_LOOKBACK = 4;
/** 저점 우상향/고점 우하향(구조 반전) 판정용 스윙 피벗 룩백 봉수(캔들 슬라이스 길이). */
export const HIGHER_LOW_LOOKBACK = 30;

/** 레짐 게이트 — 추세 역방향 모멘텀 신호 가중 감쇠 계수(0.5=절반). */
export const REGIME_DAMPEN = 0.5;

/**
 * 장기추세 레짐 필터 — 120일선 기울기 측정 룩백(봉). 이 구간 SMA120 변화로 강세/약세 판정.
 * 약세 레짐(120선 우하향 + 가격 아래)에선 BUY 를 veto(하락 종목 역추세 롱 차단).
 */
export const REGIME_SLOPE_LOOKBACK = 20;

/**
 * 진입 선별성 — "강한 트리거" 규칙. 매 봉 신호(롱 편향) 대신, attribution 에서 적중률이 검증된
 * 트리거(교차·거래량 급증)가 **새로 발화한** 봉에서만 + 4축 컨플루언스(action 일치) + 쿨다운으로 진입.
 * 아웃오브샘플 손익비 0.92(매봉)의 근본 원인(과다 진입) 대응.
 */
export const STRONG_BULL_TRIGGERS = [
  "MACD_CROSS_UP",
  "MA_GOLDEN_CROSS",
  "VOLUME_SURGE_UP",
] as const;
export const STRONG_BEAR_TRIGGERS = [
  "MACD_CROSS_DOWN",
  "MA_DEAD_CROSS",
  "VOLUME_SURGE_DOWN",
] as const;
/** 진입 후 같은 방향 재진입 금지 기간(봉) — 중첩 상관 거래 누적 차단. */
export const DEFAULT_COOLDOWN_DAYS = 5;

// ───────────────────────── 시장 구조 기반 TP/SL ─────────────────────────

/** 매물대(Volume Profile) · 스윙 고저 계산 룩백 봉 수 (≈ 3개월 일봉). */
export const STRUCTURE_LOOKBACK = 60;
/** Volume Profile 구간 수 — 구간폭 ≈ (고가-저가)/40. */
export const STRUCTURE_BINS = 40;
/** 스윙 고저 피벗 검출 윈도우(양방향 비교 봉 수). */
export const STRUCTURE_SWING_WINDOW = 3;
/** MA 손절 기간. 0이면 비활성. */
export const STRUCTURE_MA_STOP = 20;
/** 최소 보상:위험 비율 — 미충족 셋업은 스킵(ATR 폴백). */
export const STRUCTURE_MIN_RRR = 1.5;
