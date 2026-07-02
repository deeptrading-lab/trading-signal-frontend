/**
 * 채점 원장 행 → 적중률 집계(순수 함수).
 *
 * PRD `signal-scorecard` §3-3-A / §9 D3 + `scorecard-relative-scoring`.
 *
 * 채점 완료(hit/miss/flat) horizon 만 차원별로 group-by 한다.
 * - 차원: verdict별 · confidence별 · horizon별 · signalScore 구간별(보조) · regime별(신규).
 * - **hit/miss/flat 카운트 = 주 지표(기본 excess) 기준** — status 컬럼이 v2 cron 에서 주 지표로
 *   산출되므로 status 를 그대로 센다. hitRate = hit/(hit+miss)(flat 분모 제외, 분모 0 이면 null).
 * - **참고용 abs 적중률** — 같은 셀의 절대 수익률(returnPct)을 verdict 와 ±T 로 재판정해 abs
 *   기준 hit/miss 를 별도로 센다(시장 베타 기여분 비교). absHitRate = absHit/(absHit+absMiss).
 * - pending/skipped 는 집계 제외.
 */

import type {
  HorizonStatus,
  ScorecardConfidence,
  ScorecardHorizon,
  ScorecardRegime,
  ScorecardRow,
  ScorecardSummaryCell,
} from "@/lib/types/scorecard/scorecard";
import { HORIZONS, HIT_THRESHOLD_PCT } from "@/lib/server/scorecard/constants";
import { scoreOutcome } from "@/lib/server/scorecard/scoring";

type Counts = {
  hit: number;
  miss: number;
  flat: number;
  /** 참고용 abs 기준(같은 표본을 절대수익+±T 로 재판정). */
  absHit: number;
  absMiss: number;
};

function emptyCounts(): Counts {
  return { hit: 0, miss: 0, flat: 0, absHit: 0, absMiss: 0 };
}

function add(counts: Counts, status: HorizonStatus): void {
  if (status === "hit") counts.hit += 1;
  else if (status === "miss") counts.miss += 1;
  else if (status === "flat") counts.flat += 1;
}

/** abs(절대수익률) 기준 재판정 누적 — returnPct·verdict 로 ±T 판정. flat 은 abs 분모서도 제외. */
function addAbs(counts: Counts, verdict: ScorecardRow["verdict"], returnPct: number | null): void {
  if (returnPct === null || !Number.isFinite(returnPct)) return;
  const o = scoreOutcome(verdict, returnPct, HIT_THRESHOLD_PCT);
  if (o === "hit") counts.absHit += 1;
  else if (o === "miss") counts.absMiss += 1;
}

function horizonStatus(row: ScorecardRow, h: ScorecardHorizon): HorizonStatus {
  return h === "d1"
    ? row.d1Status
    : h === "w1"
      ? row.w1Status
      : h === "w2"
        ? row.w2Status
        : row.m1Status;
}

function horizonReturnPct(row: ScorecardRow, h: ScorecardHorizon): number | null {
  return h === "d1"
    ? row.d1ReturnPct
    : h === "w1"
      ? row.w1ReturnPct
      : h === "w2"
        ? row.w2ReturnPct
        : row.m1ReturnPct;
}

function horizonRegime(row: ScorecardRow, h: ScorecardHorizon): ScorecardRegime | null {
  return h === "d1"
    ? row.d1Regime
    : h === "w1"
      ? row.w1Regime
      : h === "w2"
        ? row.w2Regime
        : row.m1Regime;
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
  const absDenom = counts.absHit + counts.absMiss;
  return {
    dimension,
    key,
    horizon,
    hit: counts.hit,
    miss: counts.miss,
    flat: counts.flat,
    total: counts.hit + counts.miss + counts.flat,
    hitRate: denom > 0 ? counts.hit / denom : null,
    absHitRate: absDenom > 0 ? counts.absHit / absDenom : null,
    absSample: absDenom,
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
 * - verdict / confidence / signalScore / regime 차원은 horizon 별로 분리(셀당 단일 horizon).
 * - horizon 차원은 전 행 합산(horizon=자기 자신).
 */
export function summarizeScorecard(rows: ScorecardRow[]): ScorecardSummaryCell[] {
  const verdictMap = new Map<string, Counts>();
  const confMap = new Map<string, Counts>();
  const horizonMap = new Map<ScorecardHorizon, Counts>();
  const scoreMap = new Map<string, Counts>();
  const regimeMap = new Map<string, Counts>();

  const bump = (
    map: Map<string, Counts>,
    key: string,
    status: HorizonStatus,
    verdict: ScorecardRow["verdict"],
    returnPct: number | null,
  ): void => {
    const c = map.get(key) ?? emptyCounts();
    add(c, status);
    addAbs(c, verdict, returnPct);
    map.set(key, c);
  };

  for (const row of rows) {
    for (const h of HORIZONS) {
      const s = horizonStatus(row, h);
      if (s !== "hit" && s !== "miss" && s !== "flat") continue;

      const ret = horizonReturnPct(row, h);

      bump(verdictMap, `${row.verdict}|${h}`, s, row.verdict, ret);
      bump(confMap, `${row.decisionConfidence}|${h}`, s, row.verdict, ret);

      const hc = horizonMap.get(h) ?? emptyCounts();
      add(hc, s);
      addAbs(hc, row.verdict, ret);
      horizonMap.set(h, hc);

      const bucket = scoreBucket(row.signalScore);
      if (bucket) bump(scoreMap, `${bucket}|${h}`, s, row.verdict, ret);

      const regime = horizonRegime(row, h);
      if (regime) bump(regimeMap, `${regime}|${h}`, s, row.verdict, ret);
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
  for (const [composite, counts] of regimeMap) {
    const [regime, h] = composite.split("|");
    cells.push(toCell("regime", regime, h as ScorecardHorizon, counts));
  }

  return cells;
}
