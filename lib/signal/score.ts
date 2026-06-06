/**
 * 스코어링 — 축별 RuleHit[] → AxisScore(0~100) → 가중합 종합점수 → BUY/HOLD/SELL + confidence.
 */

import type {
  AxisKey,
  AxisScore,
  RuleHit,
  RuleDirection,
  SignalAction,
} from "@/lib/types/signal";
import { AXIS_SCALE, AXIS_WEIGHTS, BUY_THRESHOLD, SELL_THRESHOLD } from "./weights";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const sign = (v: number): RuleDirection => (v > 0 ? 1 : v < 0 ? -1 : 0);

/**
 * 축 net 가중합(Σ direction·weight)을 ±scale 기준 0~100 으로 정규화. 50=중립.
 */
export function aggregateAxis(axis: AxisKey, hits: RuleHit[]): AxisScore {
  const net = hits.reduce((s, h) => s + h.direction * h.weight, 0);
  const scale = AXIS_SCALE[axis];
  const score = clamp(50 + (net / scale) * 50, 0, 100);
  return { axis, score, direction: sign(net), hits };
}

export type Composite = {
  action: SignalAction;
  score: number;
  confidence: number;
};

/**
 * 축 점수 가중평균 → 종합점수 → 밴드 매핑. confidence = 종합 방향에 동의하는 축 비율.
 */
export function composite(
  axes: AxisScore[],
  opts?: { axisWeights?: Record<AxisKey, number>; buyThreshold?: number; sellThreshold?: number },
): Composite {
  const weights = opts?.axisWeights ?? AXIS_WEIGHTS;
  const buyT = opts?.buyThreshold ?? BUY_THRESHOLD;
  const sellT = opts?.sellThreshold ?? SELL_THRESHOLD;

  const totalW = axes.reduce((s, a) => s + weights[a.axis], 0) || 1;
  const score = axes.reduce((s, a) => s + a.score * weights[a.axis], 0) / totalW;

  const action: SignalAction = score >= buyT ? "BUY" : score <= sellT ? "SELL" : "HOLD";
  const overallDir: RuleDirection = action === "BUY" ? 1 : action === "SELL" ? -1 : 0;

  const agreeing = axes.filter((a) => a.direction === overallDir).length;
  const confidence = axes.length > 0 ? agreeing / axes.length : 0;

  return { action, score, confidence };
}
