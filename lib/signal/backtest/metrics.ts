/**
 * 백테스트 집계 지표 — 적중률·손익비·평균수익·MDD.
 *
 * 합격선(로드맵 §5.1 / 웹 리서치): 손익비>1.5 양호·>2 우수, 적중률>50%, 표본 100+.
 */

import type { BacktestMetrics, BacktestTrade } from "@/lib/types/signal";

export function computeMetrics(trades: BacktestTrade[]): BacktestMetrics {
  const wins = trades.filter((t) => t.label === "WIN").length;
  const losses = trades.filter((t) => t.label === "LOSS").length;
  const neutrals = trades.filter((t) => t.label === "NEUTRAL").length;

  const grossProfit = trades
    .filter((t) => t.returnPct > 0)
    .reduce((s, t) => s + t.returnPct, 0);
  const grossLoss = trades
    .filter((t) => t.returnPct < 0)
    .reduce((s, t) => s + Math.abs(t.returnPct), 0);

  const decided = wins + losses;
  const hitRate = decided > 0 ? wins / decided : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgReturnPct =
    trades.length > 0
      ? trades.reduce((s, t) => s + t.returnPct, 0) / trades.length
      : 0;

  // MDD — 신호 순서대로 수익률 누적했을 때 고점 대비 최대 낙폭.
  let cum = 0;
  let peak = 0;
  let maxDrawdownPct = 0;
  for (const t of trades) {
    cum += t.returnPct;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
  }

  return {
    trades: trades.length,
    hitRate,
    profitFactor,
    avgReturnPct,
    maxDrawdownPct,
    wins,
    losses,
    neutrals,
  };
}
