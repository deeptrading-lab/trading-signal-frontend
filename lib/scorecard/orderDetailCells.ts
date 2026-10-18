/**
 * 판정별 상세 표 행 정리 — 차원·평가 시점 필터 적용 후, 구분(key)별로 묶어 정렬한다.
 *
 * 그룹 순서는 **그룹 단위 값**(그 구분 셀들의 최대 표본)으로 정한다. 셀 total 로 정렬하면 시점별 표본이
 * 다를 때(예: 새 분석이 1일만 채점된 상태) 같은 구분이 다른 구분 사이로 흩어진다(#396 QA).
 * 그룹 안은 평가 시점 순(1일 → 1주 → 2주 → 1달). 평가 시점별 차원은 시점 순 그대로.
 */

import type {
  ScorecardDimension,
  ScorecardHorizon,
  ScorecardSummaryCell,
} from "@/lib/types/scorecard/scorecard";

const HORIZON_ORDER: readonly ScorecardHorizon[] = ["d1", "w1", "w2", "m1"];
/** 모르는 값("all" 등)은 맨 뒤로. */
const horizonRank = (h: string) => {
  const i = HORIZON_ORDER.indexOf(h as ScorecardHorizon);
  return i === -1 ? HORIZON_ORDER.length : i;
};

export function orderDetailCells(
  cells: ScorecardSummaryCell[],
  dimension: ScorecardDimension,
  horizon: ScorecardHorizon | "all",
): ScorecardSummaryCell[] {
  const inDim = cells.filter((c) => c.dimension === dimension);
  if (dimension === "horizon") {
    // horizon 차원은 셀 자체가 시점별이라 필터 무관(전부 노출).
    return [...inDim].sort((a, b) => horizonRank(a.key) - horizonRank(b.key));
  }

  const shown = inDim.filter((c) => horizon === "all" || c.horizon === horizon);
  // 그룹 크기는 **보이는 행** 기준 — 특정 시점 필터일 때 표본 열이 내림차순으로 읽히게.
  const groupSize = new Map<string, number>();
  for (const c of shown) groupSize.set(c.key, Math.max(groupSize.get(c.key) ?? 0, c.total));

  return shown.sort((a, b) => {
    const diff = (groupSize.get(b.key) ?? 0) - (groupSize.get(a.key) ?? 0);
    if (diff !== 0) return diff;
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    return horizonRank(a.horizon) - horizonRank(b.horizon);
  });
}
