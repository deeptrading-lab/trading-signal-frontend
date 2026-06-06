/**
 * 변동성 축 — 볼린저 밴드 위치(pctB)·스퀴즈.
 *
 * 하단 터치(pctB≤0)=과매도 반등 기대(+), 상단 터치(pctB≥1)=과열(-).
 * 스퀴즈(밴드폭 수축)는 변동성 폭발 임박 — 방향 미정이라 점수 0(정보용).
 */

import type { RuleHit } from "@/lib/types/signal";
import type { FactorContext } from "../context";
import { RULE_WEIGHTS, BOLL_SQUEEZE_BW } from "../weights";

export function evaluateVolatility(ctx: FactorContext): RuleHit[] {
  const { i, boll } = ctx;
  const hits: RuleHit[] = [];
  const p = boll[i];

  if (p.pctB !== null) {
    if (p.pctB <= 0) {
      hits.push({
        key: "BOLL_LOWER_TOUCH",
        axis: "volatility",
        direction: 1,
        weight: RULE_WEIGHTS.bollTouch,
        detail: `%B ${p.pctB.toFixed(2)}`,
      });
    } else if (p.pctB >= 1) {
      hits.push({
        key: "BOLL_UPPER_TOUCH",
        axis: "volatility",
        direction: -1,
        weight: RULE_WEIGHTS.bollTouch,
        detail: `%B ${p.pctB.toFixed(2)}`,
      });
    }
  }

  if (p.bandwidth !== null && p.bandwidth < BOLL_SQUEEZE_BW) {
    hits.push({
      key: "BOLL_SQUEEZE",
      axis: "volatility",
      direction: 0,
      weight: 0,
      detail: `밴드폭 ${(p.bandwidth * 100).toFixed(1)}%`,
    });
  }

  return hits;
}
