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
  DirectionGate,
  DirectionGateSide,
  HorizonStatus,
  ScorecardConfidence,
  ScorecardHorizon,
  ScorecardRegime,
  ScorecardRow,
  ScorecardSummaryCell,
} from "@/lib/types/scorecard/scorecard";
import {
  HORIZONS,
  HIT_THRESHOLD_PCT,
  OPEN_BETA_HORIZON,
  OPEN_BETA_MARGIN_PP,
  OPEN_BETA_MIN_N,
} from "@/lib/server/scorecard/constants";
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

const BULL_VERDICTS = new Set<ScorecardRow["verdict"]>(["BUY", "OVERWEIGHT"]);
const BEAR_VERDICTS = new Set<ScorecardRow["verdict"]>(["SELL", "REDUCE", "UNDERWEIGHT"]);

function gateSide(n: number, hits: number, baseCount: number, sample: number): DirectionGateSide {
  const hitRate = n > 0 ? hits / n : null;
  const baseRate = sample > 0 ? baseCount / sample : null;
  // 소수 6자리 반올림 — (0.6 − 0.5) × 100 = 9.999… 처럼 부동소수 오차로 경계(+10%p)가 미달되는 것 방지.
  const diffPp =
    hitRate !== null && baseRate !== null
      ? Math.round((hitRate - baseRate) * 100 * 1e6) / 1e6
      : null;
  const enoughSample = n >= OPEN_BETA_MIN_N;
  return {
    n,
    hits,
    hitRate,
    baseRate,
    diffPp,
    enoughSample,
    pass: enoughSample && diffPp !== null && diffPp >= OPEN_BETA_MARGIN_PP,
  };
}

/**
 * 오픈베타 전환 기준 — 강세군/약세군 방향 적중률이 같은 표본의 찍기 점수보다 MARGIN 이상 높은가.
 *
 * ponytail: 찍기 점수는 전 기간 풀링(같은 진입 주끼리 매칭 아님). 표본이 진입일별로 충분히 쌓이면
 * 진입 주 단위 base rate 로 바꿀 것(풀링은 국면이 섞이면 Simpson 왜곡 가능).
 */
export function summarizeDirectionGate(
  rows: ScorecardRow[],
  h: ScorecardHorizon = OPEN_BETA_HORIZON,
): DirectionGate {
  let sample = 0;
  let up = 0;
  let down = 0;
  let bullN = 0;
  let bullHits = 0;
  let bearN = 0;
  let bearHits = 0;

  for (const row of rows) {
    const s = horizonStatus(row, h);
    if (s !== "hit" && s !== "miss" && s !== "flat") continue;
    const ret = horizonReturnPct(row, h);
    if (ret === null || !Number.isFinite(ret)) continue;

    sample += 1;
    if (ret > 0) up += 1;
    else if (ret < 0) down += 1;

    if (BULL_VERDICTS.has(row.verdict)) {
      bullN += 1;
      if (ret > 0) bullHits += 1;
    } else if (BEAR_VERDICTS.has(row.verdict)) {
      bearN += 1;
      if (ret < 0) bearHits += 1;
    }
  }

  const bull = gateSide(bullN, bullHits, up, sample);
  const bear = gateSide(bearN, bearHits, down, sample);
  return {
    horizon: h,
    sample,
    marginPp: OPEN_BETA_MARGIN_PP,
    minN: OPEN_BETA_MIN_N,
    bull,
    bear,
    pass: bull.pass && bear.pass,
  };
}
