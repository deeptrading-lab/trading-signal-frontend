/**
 * 거래량 축 — 당일 거래량/20일 MA 배수 × 가격 방향(동반성).
 *
 * "진짜 움직임인가" 확인 신호. 상승+거래량 급증=강세 확인, 하락+급증=약세 확인.
 * 거래량 위축은 관망(점수 0, 정보용 hit).
 */

import type { RuleHit } from "@/lib/types/signal";
import type { FactorContext } from "../context";
import { RULE_WEIGHTS, VOLUME_SURGE_MULT, VOLUME_DRY_MULT } from "../weights";

export function evaluateVolume(ctx: FactorContext): RuleHit[] {
  const { i, candles, volumes, volMA } = ctx;
  const hits: RuleHit[] = [];
  const ma = volMA[i];
  if (ma === null || ma === 0) return hits;

  const ratio = volumes[i] / ma;
  const detail = `거래량 ${ratio.toFixed(1)}배`;
  const candle = candles[i];
  const up = candle.close >= candle.open;

  if (ratio >= VOLUME_SURGE_MULT) {
    hits.push({
      key: up ? "VOLUME_SURGE_UP" : "VOLUME_SURGE_DOWN",
      axis: "volume",
      direction: up ? 1 : -1,
      weight: RULE_WEIGHTS.volumeSurge,
      detail,
    });
  } else if (ratio <= VOLUME_DRY_MULT) {
    hits.push({ key: "VOLUME_DRY", axis: "volume", direction: 0, weight: 0, detail });
  }

  return hits;
}
