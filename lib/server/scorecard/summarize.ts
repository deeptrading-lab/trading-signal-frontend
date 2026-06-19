/**
 * 채점 원장 행 → 적중률 집계(순수 함수).
 *
 * PRD `signal-scorecard` §3-3-A / §9 D3. 채점 완료(hit/miss/flat) horizon 만 차원별로 group-by.
 * - 차원: verdict별 · confidence별(HIGH/MEDIUM/LOW) · horizon별(d1/w1/m1) · signalScore 구간별(보조).
 * - hitRate = hit / (hit + miss). flat 은 분모 제외, 분모 0 이면 null.
 * - pending/skipped 는 집계 제외.
 */

import type {
  HorizonStatus,
  ScorecardConfidence,
  ScorecardHorizon,
  ScorecardRow,
  ScorecardSummaryCell,
} from "@/lib/types/scorecard/scorecard";
import { HORIZONS } from "@/lib/server/scorecard/constants";

type Counts = { hit: number; miss: number; flat: number };

function emptyCounts(): Counts {
  return { hit: 0, miss: 0, flat: 0 };
}

function add(counts: Counts, status: HorizonStatus): void {
  if (status === "hit") counts.hit += 1;
  else if (status === "miss") counts.miss += 1;
  else if (status === "flat") counts.flat += 1;
}

function horizonStatus(row: ScorecardRow, h: ScorecardHorizon): HorizonStatus {
  return h === "d1" ? row.d1Status : h === "w1" ? row.w1Status : row.m1Status;
}

/** signalScore 구간 라벨(보조 차원). */
function scoreBucket(score: number | null): string | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score < 40) return "0-40";
  if (score < 60) return "40-60";
  return "60-100";
}

function toCell(
  dimension: ScorecardSummaryCell["dimension"],
  key: string,
  horizon: ScorecardHorizon | "all",
  counts: Counts,
): ScorecardSummaryCell {
  const denom = counts.hit + counts.miss;
  return {
    dimension,
    key,
    horizon,
    hit: counts.hit,
    miss: counts.miss,
    flat: counts.flat,
    total: counts.hit + counts.miss + counts.flat,
    hitRate: denom > 0 ? counts.hit / denom : null,
  };
}

/** 채점 완료 horizon 수(전체 행 × 3 horizon 중 hit/miss/flat). */
export function countScored(rows: ScorecardRow[]): number {
  let n = 0;
  for (const row of rows) {
    for (const h of HORIZONS) {
      const s = horizonStatus(row, h);
      if (s === "hit" || s === "miss" || s === "flat") n += 1;
    }
  }
  return n;
}

/**
 * 차원별 집계 셀 배열 생성.
 * - verdict / confidence / signalScore 차원은 horizon 별로 분리(셀당 단일 horizon).
 * - horizon 차원은 전 행 합산(horizon=자기 자신).
 */
export function summarizeScorecard(rows: ScorecardRow[]): ScorecardSummaryCell[] {
  // 키: `${dimension}|${key}|${horizon}` → Counts
  const verdictMap = new Map<string, Counts>();
  const confMap = new Map<string, Counts>();
  const horizonMap = new Map<ScorecardHorizon, Counts>();
  const scoreMap = new Map<string, Counts>();

  const bump = (
    map: Map<string, Counts>,
    key: string,
    status: HorizonStatus,
  ): void => {
    const c = map.get(key) ?? emptyCounts();
    add(c, status);
    map.set(key, c);
  };

  for (const row of rows) {
    for (const h of HORIZONS) {
      const s = horizonStatus(row, h);
      if (s !== "hit" && s !== "miss" && s !== "flat") continue;

      bump(verdictMap, `${row.verdict}|${h}`, s);
      bump(confMap, `${row.decisionConfidence}|${h}`, s);

      const hc = horizonMap.get(h) ?? emptyCounts();
      add(hc, s);
      horizonMap.set(h, hc);

      const bucket = scoreBucket(row.signalScore);
      if (bucket) bump(scoreMap, `${bucket}|${h}`, s);
    }
  }

  const cells: ScorecardSummaryCell[] = [];

  for (const [composite, counts] of verdictMap) {
    const [verdict, h] = composite.split("|");
    cells.push(toCell("verdict", verdict, h as ScorecardHorizon, counts));
  }
  for (const [composite, counts] of confMap) {
    const [conf, h] = composite.split("|");
    cells.push(toCell("confidence", conf as ScorecardConfidence, h as ScorecardHorizon, counts));
  }
  for (const [h, counts] of horizonMap) {
    cells.push(toCell("horizon", h, h, counts));
  }
  for (const [composite, counts] of scoreMap) {
    const [bucket, h] = composite.split("|");
    cells.push(toCell("signalScore", bucket, h as ScorecardHorizon, counts));
  }

  return cells;
}
