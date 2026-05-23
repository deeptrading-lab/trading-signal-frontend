/**
 * 오늘장 특징 — 상승/하락 종목 수 스냅샷.
 *
 * 시안 `Dashboard.tsx` 의 `상승 종목 1,245` / `하락 종목 890` 정합.
 */

export type MarketSnapshot = {
  /** 상승 종목 수. */
  up: number;
  /** 하락 종목 수. */
  down: number;
};
