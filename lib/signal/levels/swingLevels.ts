/**
 * 스윙 고저(Swing High/Low) — 박스권 경계·구조적 지지·저항 탐지.
 *
 * 피벗 고점(Swing High): window 봉 양방향에서 가장 높은 고가 → 저항대.
 * 피벗 저점(Swing Low): window 봉 양방향에서 가장 낮은 저가 → 지지대.
 *
 * 입력은 **과거 봉만** (룩어헤드 차단은 호출부 책임).
 * window 가 클수록 더 강한(주요) 피벗만 추출 — 기본 3봉은 단기 박스권에 적합.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";

/**
 * 피벗 고점 배열 반환.
 * candles[i].high > candles[i-k].high AND candles[i].high > candles[i+k].high (k=1..window)
 *
 * 마지막 window 봉은 우측 비교가 불가능해 제외(미래 없음 → 피벗 확정 불가).
 */
export function findSwingHighs(
  candles: StockDailyCandle[],
  window = 3,
): number[] {
  const result: number[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const h = candles[i].high;
    let isSwing = true;
    for (let k = 1; k <= window; k++) {
      if (candles[i - k].high >= h || candles[i + k].high >= h) {
        isSwing = false;
        break;
      }
    }
    if (isSwing) result.push(h);
  }
  return result;
}

/**
 * 피벗 저점 배열 반환.
 * candles[i].low < candles[i-k].low AND candles[i].low < candles[i+k].low (k=1..window)
 */
export function findSwingLows(
  candles: StockDailyCandle[],
  window = 3,
): number[] {
  const result: number[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const l = candles[i].low;
    let isSwing = true;
    for (let k = 1; k <= window; k++) {
      if (candles[i - k].low <= l || candles[i + k].low <= l) {
        isSwing = false;
        break;
      }
    }
    if (isSwing) result.push(l);
  }
  return result;
}
