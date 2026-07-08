/**
 * ATR(Average True Range) — 직전 N봉 True Range 평균 + 구조 폴백 배수.
 *
 * 백테스트 Triple Barrier(`lib/signal/backtest/label.ts`)와 라이브 단타 레벨
 * (`buildIntradayLevels`)이 **같은 계산·같은 폴백 배수**를 공유한다 — 백테스트로 보정된
 * 파라미터가 라이브와 어긋나지 않게 단일 위치에 둔다(PRD intraday-decision-overhaul PR-1a).
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";

export const ATR_PERIOD = 14;
/** 구조 barrier 미확보 시 ATR 비대칭 폴백 배수 — 백테스트 기존 best 파라미터(label.ts에서 이동). */
export const ATR_FALLBACK_TP_MULT = 3;
export const ATR_FALLBACK_SL_MULT = 1.5;

/** fromIdx 종가까지의 직전 period True Range 평균. 데이터 부족 시 null. */
export function atrAt(
  candles: StockDailyCandle[],
  fromIdx: number,
  period: number = ATR_PERIOD,
): number | null {
  if (fromIdx < period) return null;
  let sum = 0;
  for (let j = fromIdx - period + 1; j <= fromIdx; j++) {
    const c = candles[j];
    const prevClose = candles[j - 1].close;
    sum += Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    );
  }
  return sum / period;
}
