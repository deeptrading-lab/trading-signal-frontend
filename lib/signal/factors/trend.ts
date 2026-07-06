/**
 * 추세 축 — 이평 정배열·현재가 위치·골든/데드크로스·ADX 추세강도.
 *
 * "큰 흐름이 위인가 아래인가" — 가장 높은 가중치 축. 모멘텀 신호의 레짐 게이트 기준.
 */

import type { RuleHit } from "@/lib/types/signal";
import { crossover, crossunder } from "@/lib/utils/technicalIndicators";
import type { FactorContext } from "../context";
import {
  RULE_WEIGHTS,
  ADX_TREND,
  ADX_WEAK,
  HIGHER_LOW_LOOKBACK,
  STRUCTURE_SWING_WINDOW,
} from "../weights";
import { findSwingHighs, findSwingLows } from "../levels/swingLevels";

export type EvaluateTrendOptions = {
  /** 저점 우상향/고점 우하향 판정용 스윙 룩백(캔들 슬라이스 길이). 기본 HIGHER_LOW_LOOKBACK(30). */
  higherLowLookback?: number;
};

export function evaluateTrend(ctx: FactorContext, opts?: EvaluateTrendOptions): RuleHit[] {
  const { i, closes, sma, adx, candles } = ctx;
  const hits: RuleHit[] = [];
  const s = sma.short[i];
  const m = sma.mid[i];
  const l = sma.long[i];
  const b = sma.base[i];

  // 1) 정배열/역배열 — 4개 이평이 모두 유효할 때만.
  if (s !== null && m !== null && l !== null && b !== null) {
    if (s > m && m > l && l > b) {
      hits.push({
        key: "MA_ALIGNED_BULL",
        axis: "trend",
        direction: 1,
        weight: RULE_WEIGHTS.maAligned,
      });
    } else if (s < m && m < l && l < b) {
      hits.push({
        key: "MA_ALIGNED_BEAR",
        axis: "trend",
        direction: -1,
        weight: RULE_WEIGHTS.maAligned,
      });
    }
  }

  // 2) 현재가 vs 주요 이평선(20/60/120) 위치 — 전부 위/아래일 때만.
  const close = closes[i];
  const refs = [m, l, b].filter((v): v is number => v !== null);
  if (refs.length === 3) {
    if (refs.every((v) => close > v)) {
      hits.push({
        key: "PRICE_ABOVE_MAS",
        axis: "trend",
        direction: 1,
        weight: RULE_WEIGHTS.pricePosition,
      });
    } else if (refs.every((v) => close < v)) {
      hits.push({
        key: "PRICE_BELOW_MAS",
        axis: "trend",
        direction: -1,
        weight: RULE_WEIGHTS.pricePosition,
      });
    }
  }

  // 3) 골든/데드크로스 — 20일선 × 60일선.
  if (crossover(sma.mid, sma.long, i)) {
    hits.push({
      key: "MA_GOLDEN_CROSS",
      axis: "trend",
      direction: 1,
      weight: RULE_WEIGHTS.maCross,
    });
  } else if (crossunder(sma.mid, sma.long, i)) {
    hits.push({
      key: "MA_DEAD_CROSS",
      axis: "trend",
      direction: -1,
      weight: RULE_WEIGHTS.maCross,
    });
  }

  // 4) ADX 추세강도(레짐). 방향은 ±DI 비교.
  const a = adx[i];
  if (a.adx !== null && a.plusDI !== null && a.minusDI !== null) {
    if (a.adx >= ADX_TREND) {
      const up = a.plusDI > a.minusDI;
      hits.push({
        key: "TREND_STRONG",
        axis: "trend",
        direction: up ? 1 : -1,
        weight: RULE_WEIGHTS.adxRegime,
        detail: `ADX ${a.adx.toFixed(1)}`,
      });
    } else if (a.adx < ADX_WEAK) {
      hits.push({
        key: "TREND_WEAK",
        axis: "trend",
        direction: 0,
        weight: 0,
        detail: `ADX ${a.adx.toFixed(1)}`,
      });
    }
  }

  // 5) 구조 반전 임박 — 저점 우상향(바닥 다지기)/고점 우하향(천장 다지기).
  //    최근 lookback 봉 구간의 스윙 피벗(양방향 STRUCTURE_SWING_WINDOW) 마지막 두 값 비교.
  const lookback = opts?.higherLowLookback ?? HIGHER_LOW_LOOKBACK;
  const structureSlice = candles.slice(-lookback);
  const swingLows = findSwingLows(structureSlice, STRUCTURE_SWING_WINDOW);
  const swingHighs = findSwingHighs(structureSlice, STRUCTURE_SWING_WINDOW);

  if (swingLows.length >= 2) {
    const lastLow = swingLows[swingLows.length - 1];
    const prevLow = swingLows[swingLows.length - 2];
    if (lastLow > prevLow) {
      hits.push({
        key: "HIGHER_LOW_BASE",
        axis: "trend",
        direction: 1,
        weight: RULE_WEIGHTS.higherLowBase,
        detail: `저점 ${prevLow.toFixed(0)}→${lastLow.toFixed(0)}`,
      });
    }
  }
  if (swingHighs.length >= 2) {
    const lastHigh = swingHighs[swingHighs.length - 1];
    const prevHigh = swingHighs[swingHighs.length - 2];
    if (lastHigh < prevHigh) {
      hits.push({
        key: "LOWER_HIGH_TOP",
        axis: "trend",
        direction: -1,
        weight: RULE_WEIGHTS.higherLowBase,
        detail: `고점 ${prevHigh.toFixed(0)}→${lastHigh.toFixed(0)}`,
      });
    }
  }

  return hits;
}
