/**
 * 추세 축 — 이평 정배열·현재가 위치·골든/데드크로스·ADX 추세강도.
 *
 * "큰 흐름이 위인가 아래인가" — 가장 높은 가중치 축. 모멘텀 신호의 레짐 게이트 기준.
 */

import type { RuleHit } from "@/lib/types/signal";
import { crossover, crossunder } from "@/lib/utils/technicalIndicators";
import type { FactorContext } from "../context";
import { RULE_WEIGHTS, ADX_TREND, ADX_WEAK } from "../weights";

export function evaluateTrend(ctx: FactorContext): RuleHit[] {
  const { i, closes, sma, adx } = ctx;
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

  return hits;
}
