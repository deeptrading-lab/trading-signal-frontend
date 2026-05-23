/**
 * Home 차트 timeframe 토글 — 1D / 1W / 1M / 3M / 1Y / ALL.
 *
 * 시안 `AnalysisDashboard.tsx` 의 timeframe 6 옵션 정합.
 */

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export type TimeframeOption = {
  key: Timeframe;
  /** 표시 라벨 (현재는 key 동일). */
  label: Timeframe;
};
