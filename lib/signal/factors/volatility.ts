/**
 * 변동성 축 — 볼린저 밴드 위치(pctB)·스퀴즈.
 *
 * 하단 터치(pctB≤0)=과매도 반등 기대(+), 상단 터치(pctB≥1)=과열(-).
 * 스퀴즈(밴드폭 수축)는 변동성 폭발 임박 — 방향 미정이라 점수 0(정보용).
 */

import type { RuleHit, RuleDirection } from "@/lib/types/signal";
import type { FactorContext } from "../context";
import { RULE_WEIGHTS, BOLL_SQUEEZE_BW, REGIME_DAMPEN } from "../weights";

/**
 * @param trendDirection 추세 축 방향 — 역추세 밴드 터치(떨어지는 칼날 매수 등)를 레짐 게이트로 감쇠.
 *   백테스트에서 평균회귀 매수가 역예측이라, 모멘텀과 동일하게 추세 반대 신호를 약화한다.
 */
export function evaluateVolatility(
  ctx: FactorContext,
  trendDirection: RuleDirection = 0,
): RuleHit[] {
  const { i, boll } = ctx;
  const hits: RuleHit[] = [];
  const p = boll[i];

  const gated = (w: number, dir: RuleDirection) =>
    trendDirection !== 0 && dir !== 0 && dir !== trendDirection ? w * REGIME_DAMPEN : w;

  if (p.pctB !== null) {
    if (p.pctB <= 0) {
      hits.push({
        key: "BOLL_LOWER_TOUCH",
        axis: "volatility",
        direction: 1,
        weight: gated(RULE_WEIGHTS.bollTouch, 1),
        detail: `%B ${p.pctB.toFixed(2)}`,
      });
    } else if (p.pctB >= 1) {
      hits.push({
        key: "BOLL_UPPER_TOUCH",
        axis: "volatility",
        direction: -1,
        weight: gated(RULE_WEIGHTS.bollTouch, -1),
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
