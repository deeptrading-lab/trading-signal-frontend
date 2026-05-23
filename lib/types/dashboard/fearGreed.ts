/**
 * Fear & Greed Index — 시장 심리 지표.
 *
 * 값은 0~100 정수. 라벨은 enum 으로 좁혀 (Extreme Fear / Fear / Neutral / Greed / Extreme Greed)
 * 카피 매핑은 `lib/copy/dashboard/labels.ts` 에서 한글로.
 */

export type FearGreedLabel =
  | "EXTREME_FEAR"
  | "FEAR"
  | "NEUTRAL"
  | "GREED"
  | "EXTREME_GREED";

export type FearGreed = {
  /** 0~100. */
  value: number;
  label: FearGreedLabel;
};
