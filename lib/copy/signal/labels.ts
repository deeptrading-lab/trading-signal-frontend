/**
 * 시그널 규칙 엔진 UI 카피 — 규칙키→한글 라벨, 축 라벨, 액션 라벨, 면책.
 *
 * UI 미연결 단계라도 `RuleHit.key` ↔ 표시 문구의 단일 진실을 여기에 둔다(후속 카드/봇 공유).
 * 규칙 키는 `lib/signal/factors/*` 에서 발화하는 상수와 1:1.
 */

import type { AxisKey, SignalAction } from "@/lib/types/signal";

/** 축 한글 라벨. */
export const AXIS_LABEL: Record<AxisKey, string> = {
  trend: "추세",
  momentum: "모멘텀",
  volume: "거래량",
  volatility: "변동성",
};

/** 매매 액션 라벨. */
export const ACTION_LABEL: Record<SignalAction, string> = {
  BUY: "매수 우위",
  HOLD: "중립",
  SELL: "매도 우위",
};

/** 장기추세 레짐 한글 라벨(키 = String(regime)). */
export const REGIME_LABEL: Record<string, string> = {
  "1": "장기 강세",
  "-1": "장기 약세",
  "0": "중립",
};

/* ── 컴팩트 시그널 요약(종목 상세 T4 "항시") 상태·필드 카피 ── */
export const SIGNAL_SUMMARY_TITLE = "기술적 시그널";
export const SIGNAL_SUMMARY_LOADING = "시그널 분석 중…";
export const SIGNAL_SUMMARY_ERROR = "시그널을 불러올 수 없어요.";
export const SIGNAL_SUMMARY_INSUFFICIENT =
  "데이터가 부족해 시그널을 산출할 수 없어요. (최소 130봉 필요)";
export const SIGNAL_SUMMARY_LIMITED =
  "장기추세 데이터가 제한적이라 참고용으로만 보세요.";
export const SIGNAL_SUMMARY_SCORE_SUFFIX = "/ 100";
export const SIGNAL_SUMMARY_CONFIDENCE_LABEL = "동의도";
export const SIGNAL_SUMMARY_REGIME_LABEL = "장기추세";

/** 규칙키 → 한글 설명. detail(수치)은 호출부에서 덧붙인다. */
export const RULE_LABEL: Record<string, string> = {
  // 추세
  MA_ALIGNED_BULL: "이평선 정배열(5>20>60>120)",
  MA_ALIGNED_BEAR: "이평선 역배열",
  PRICE_ABOVE_MAS: "현재가가 주요 이평선 위",
  PRICE_BELOW_MAS: "현재가가 주요 이평선 아래",
  MA_GOLDEN_CROSS: "골든크로스(20×60 상향)",
  MA_DEAD_CROSS: "데드크로스(20×60 하향)",
  TREND_STRONG: "ADX 추세 강함",
  TREND_WEAK: "ADX 횡보(추세 약함)",
  HIGHER_LOW_BASE: "저점 우상향(바닥 다지기)",
  LOWER_HIGH_TOP: "고점 우하향(천장 다지기)",
  // 모멘텀
  MACD_CROSS_UP: "MACD 시그널 상향 교차",
  MACD_CROSS_DOWN: "MACD 시그널 하향 교차",
  MACD_HIST_POS: "MACD 히스토그램 양(+)",
  MACD_HIST_NEG: "MACD 히스토그램 음(-)",
  MACD_ABOVE_ZERO: "MACD 0선 위",
  MACD_CONVERGE_UP: "MACD 히스토그램 축소 중(양전환 임박)",
  MACD_CONVERGE_DOWN: "MACD 히스토그램 축소 중(음전환 임박)",
  RSI_OVERSOLD: "RSI 과매도(30 이하)",
  RSI_OVERBOUGHT: "RSI 과매수(70 이상)",
  RSI_ABOVE_50: "RSI 중심선(50) 위",
  RSI_BELOW_50: "RSI 중심선(50) 아래",
  // 거래량
  VOLUME_SURGE_UP: "상승 + 거래량 급증(동반 강세)",
  VOLUME_SURGE_DOWN: "하락 + 거래량 급증(동반 약세)",
  VOLUME_DRY: "거래량 위축(관망)",
  // 거래량 — 분봉 graded 축(거래량 z-score, intradayAxes)
  VOLUME_Z_UP: "상승 + 평균 대비 거래량 우위",
  VOLUME_Z_DOWN: "하락 + 평균 대비 거래량 우위",
  // 변동성
  BOLL_LOWER_TOUCH: "볼린저 하단 터치(과매도)",
  BOLL_UPPER_TOUCH: "볼린저 상단 터치(과열)",
  BOLL_SQUEEZE: "볼린저 스퀴즈(변동성 수축)",
  // 변동성 — 분봉 graded 축(당일 VWAP σ-거리, intradayAxes)
  VWAP_ABOVE: "현재가 VWAP 위(당일 매수 우위)",
  VWAP_BELOW: "현재가 VWAP 아래(당일 매도 우위)",
};

/** 규칙키→라벨, 미정의 키는 키 자체로 폴백. */
export function ruleLabel(key: string): string {
  return RULE_LABEL[key] ?? key;
}

/** 모든 응답 하단 면책 — 단정적 권유 금지(로드맵 §7 법적 리스크). */
export const SIGNAL_DISCLAIMER =
  "본 신호는 과거 가격·거래량 데이터에 기반한 기술적 참고 정보이며, 투자 권유가 아닙니다. 투자 판단과 책임은 본인에게 있습니다.";
