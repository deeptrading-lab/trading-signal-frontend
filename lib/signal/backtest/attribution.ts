/**
 * 규칙별 예측력 attribution — "어느 판단 기준이 실제로 맞는가".
 *
 * 보정 루프의 핵심 산출물: hitRate 가 낮거나(랜덤<0.5) 역예측인 규칙을 식별 →
 * `weights.ts` 에서 가중치 축소·제거. hitRate 오름차순 정렬(문제 규칙이 위로).
 */

import type { BacktestTrade, RuleAttribution } from "@/lib/types/signal";

export function computeAttribution(trades: BacktestTrade[]): RuleAttribution[] {
  const byKey = new Map<string, { count: number; wins: number; decided: number; retSum: number }>();

  for (const t of trades) {
    for (const key of t.ruleKeys) {
      const agg = byKey.get(key) ?? { count: 0, wins: 0, decided: 0, retSum: 0 };
      agg.count += 1;
      agg.retSum += t.returnPct;
      if (t.label === "WIN") {
        agg.wins += 1;
        agg.decided += 1;
      } else if (t.label === "LOSS") {
        agg.decided += 1;
      }
      byKey.set(key, agg);
    }
  }

  const rows: RuleAttribution[] = [];
  for (const [key, a] of byKey) {
    rows.push({
      key,
      count: a.count,
      hitRate: a.decided > 0 ? a.wins / a.decided : 0,
      avgReturnPct: a.count > 0 ? a.retSum / a.count : 0,
    });
  }

  // 저성과·역예측 규칙이 위로 — 보정 우선순위.
  rows.sort((x, y) => x.hitRate - y.hitRate);
  return rows;
}
