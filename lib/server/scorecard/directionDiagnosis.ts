/**
 * AI 방향 품질 진단(Phase 1) — 순수 계산 모듈.
 *
 * PRD `ai-direction-quality` §3-1. 판정 규칙 SSOT = `docs/analysis/ai-direction-diagnosis-preregistration.md`.
 * 여기 있는 judge* 함수는 사전 등록 §2 의 문장을 그대로 코드로 옮긴 것이다(임계값을 바꾸지 말 것).
 * I/O 없음 — Supabase·KIS 조회는 `scripts/scorecard/direction-diagnosis.mts` 담당.
 */

import type { DirectionGate, ScorecardRow } from "@/lib/types/scorecard/scorecard";
import type { FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import { summarizeDirectionGate } from "@/lib/server/scorecard/summarize";

export type DiagnosisLabel = "지지" | "기각" | "판정 불가";

/** 표본 부족 기준 — 비교 집단 중 하나라도 n < 15 면 판정 불가(사전 등록 §1). */
export const MIN_GROUP_N = 15;

// ── 공통 정의 ────────────────────────────────────────────────

/** 방향 점수 d — BUY·OVERWEIGHT +1, HOLD 0, UNDERWEIGHT·REDUCE·SELL −1. */
export function directionScore(verdict: FinalVerdict): -1 | 0 | 1 {
  if (verdict === "BUY" || verdict === "OVERWEIGHT") return 1;
  if (verdict === "HOLD") return 0;
  return -1;
}

/** ISO 주(월요일 시작) 키 — 그 주 월요일 `YYYY-MM-DD`. 입력은 `YYYY-MM-DD`. */
export function isoWeekKey(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// ── 기초 통계 ────────────────────────────────────────────────

/** (a − b) × 100 %p, 소수 6자리 반올림 — 0.3−0.2=0.0999… 같은 부동소수 오차로 경계가 어긋나는 것 방지(gateSide 와 동일). */
export function toPp(a: number, b: number): number {
  return Math.round((a - b) * 100 * 1e6) / 1e6;
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 분위수(선형 보간, R type 7). 빈 배열 null. */
export function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** 평균 순위(동점은 순위 평균, 1부터). */
export function averageRanks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
    i = j + 1;
  }
  return ranks;
}

function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs) ?? 0;
  const my = mean(ys) ?? 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? Number.NaN : sxy / Math.sqrt(sxx * syy);
}

/** Spearman 순위상관(평균 순위의 Pearson). 한쪽 분산 0 이면 NaN. */
export function spearman(xs: number[], ys: number[]): number {
  return pearson(averageRanks(xs), averageRanks(ys));
}

/**
 * Newey-West(Bartlett 커널) t — 기간이 겹치는 수익률처럼 자기상관된 시계열의 평균 t.
 * lag = 겹침 길이 − 1 (10거래일 수익이면 9). 분산이 0 이하이면 NaN.
 * (E-2 `scripts/signal/new-input-audit.mts` 에서 이동 — 수식 동일, 스윙 규칙서 감사와 공용.)
 */
export function neweyWestT(xs: number[], lag: number): number {
  const n = xs.length;
  const m = mean(xs) ?? 0;
  const d = xs.map((x) => x - m);
  const gamma = (l: number) => {
    let s = 0;
    for (let i = l; i < n; i++) s += d[i] * d[i - l];
    return s / n;
  };
  let v = gamma(0);
  for (let l = 1; l <= lag; l++) v += 2 * (1 - l / (lag + 1)) * gamma(l);
  return v > 0 ? m / Math.sqrt(v / n) : Number.NaN;
}

/** 결정론 PRNG — mulberry32. [0, 1) 균등. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 같은 그룹 평균을 뺀다(횡단면 demean). */
export function demeanByGroup(values: number[], keys: string[]): number[] {
  const sum = new Map<string, { s: number; n: number }>();
  values.forEach((v, i) => {
    const g = sum.get(keys[i]) ?? { s: 0, n: 0 };
    g.s += v;
    g.n += 1;
    sum.set(keys[i], g);
  });
  return values.map((v, i) => {
    const g = sum.get(keys[i])!;
    return v - g.s / g.n;
  });
}

export type BootstrapResult = {
  lo: number | null;
  hi: number | null;
  /** 통계량이 유한했던 재표집 수(분산 0 재표집은 버림). */
  valid: number;
  iterations: number;
};

/**
 * 클러스터 부트스트랩 퍼센타일 95% 구간 — 클러스터(진입 주)를 복원 추출해 행을 이어 붙이고 stat 을 잰다.
 * stat 이 NaN 이면 그 재표집은 버린다(valid 로 개수 보고).
 */
export function clusterBootstrapCI<T>(
  items: T[],
  clusterOf: (item: T) => string,
  stat: (sample: T[]) => number,
  iterations: number,
  seed: number,
): BootstrapResult {
  const clusters = new Map<string, T[]>();
  for (const it of items) {
    const k = clusterOf(it);
    const arr = clusters.get(k) ?? [];
    arr.push(it);
    clusters.set(k, arr);
  }
  const groups = [...clusters.keys()].sort().map((k) => clusters.get(k)!);
  const rand = mulberry32(seed);
  const stats: number[] = [];
  for (let b = 0; b < iterations; b++) {
    const sample: T[] = [];
    for (let i = 0; i < groups.length; i++) {
      sample.push(...groups[Math.floor(rand() * groups.length)]);
    }
    const v = stat(sample);
    if (Number.isFinite(v)) stats.push(v);
  }
  return {
    lo: quantile(stats, 0.025),
    hi: quantile(stats, 0.975),
    valid: stats.length,
    iterations,
  };
}

/** 값 오름차순 정렬 후 행 기준 3등분 [하위, 중위, 상위]. 경계 = round(n/3), round(2n/3). */
export function splitTerciles<T>(items: T[], value: (item: T) => number): [T[], T[], T[]] {
  const s = [...items].sort((a, b) => value(a) - value(b));
  const c1 = Math.round(s.length / 3);
  const c2 = Math.round((2 * s.length) / 3);
  return [s.slice(0, c1), s.slice(c1, c2), s.slice(c2)];
}

/** d = +1 비율. 빈 배열 null. */
export function bullShare(verdicts: FinalVerdict[]): number | null {
  return verdicts.length
    ? verdicts.filter((v) => directionScore(v) === 1).length / verdicts.length
    : null;
}

// ── H-A1 텍스트 분류 ─────────────────────────────────────────

export const HOLD_ADVICE_RE = /(유지|보유|관망|홀드|지켜)/;
export const SELL_ADVICE_RE = /(매도|축소|줄이|정리|청산|비중\s*감소)/;

/** 사전 등록 H-A1 "유지/관망" — 보유 계열 매칭 그리고 매도 계열 미매칭. */
export function isHoldAdvice(text: string | null | undefined): boolean {
  if (!text) return false;
  return HOLD_ADVICE_RE.test(text) && !SELL_ADVICE_RE.test(text);
}

// ── H-B1 병기: 진입 주 기준 찍기 점수 게이트 ──────────────────

export type WeekMatchedSide = { n: number; hitRate: number | null; baseRate: number | null; diffPp: number | null };

/**
 * 진입 주별로 `summarizeDirectionGate` 를 돌려 n 가중 합산 — 찍기 점수를 같은 주 표본으로 매칭한다.
 * hitRate = Σhits/Σn, baseRate = Σ(n_w × base_w)/Σn (각 판정이 자기 주의 찍기와 비교됨).
 */
export function weekMatchedGate(rows: ScorecardRow[]): { bull: WeekMatchedSide; bear: WeekMatchedSide } {
  const byWeek = new Map<string, ScorecardRow[]>();
  for (const r of rows) {
    const k = isoWeekKey(r.entryDate);
    byWeek.set(k, [...(byWeek.get(k) ?? []), r]);
  }
  const gates: DirectionGate[] = [...byWeek.values()].map((rs) => summarizeDirectionGate(rs));
  const side = (pick: (g: DirectionGate) => DirectionGate["bull"]): WeekMatchedSide => {
    let n = 0;
    let hits = 0;
    let base = 0;
    for (const g of gates) {
      const s = pick(g);
      if (s.n === 0 || s.baseRate === null) continue;
      n += s.n;
      hits += s.hits;
      base += s.n * s.baseRate;
    }
    const hitRate = n ? hits / n : null;
    const baseRate = n ? base / n : null;
    return {
      n,
      hitRate,
      baseRate,
      diffPp: hitRate !== null && baseRate !== null ? toPp(hitRate, baseRate) : null,
    };
  };
  return { bull: side((g) => g.bull), bear: side((g) => g.bear) };
}

// ── 판정 규칙(사전 등록 §2 그대로) ────────────────────────────

/** H-A1 1차 — UW 본문 ≥ 10건일 때 유지/관망 비율 ≥ 60% 지지, ≤ 30% 기각. */
export function judgeA1(uwCount: number, holdRatio: number | null): DiagnosisLabel {
  if (uwCount < 10 || holdRatio === null) return "판정 불가";
  if (holdRatio >= 0.6) return "지지";
  if (holdRatio <= 0.3) return "기각";
  return "판정 불가";
}

/** H-A3 — 상위(직전 상승) − 하위 분위 강세군 비율 ≥ 15%p 지지, < 5%p 기각. 분위당 n < 15 판정 불가. */
export function judgeA3(minTercileN: number, diffPp: number | null): DiagnosisLabel {
  if (minTercileN < MIN_GROUP_N || diffPp === null) return "판정 불가";
  if (diffPp >= 15) return "지지";
  if (diffPp < 5) return "기각";
  return "판정 불가";
}

/** H-A4 — 이전 강세군 비율 ≤ 20% 기각. > 20% 이고 이후(n ≥ 15) 비율이 10%p 이상 낮으면 지지. */
export function judgeA4(
  beforeShare: number | null,
  afterN: number,
  afterShare: number | null,
): DiagnosisLabel {
  if (beforeShare === null) return "판정 불가";
  if (beforeShare <= 0.2) return "기각";
  if (afterN >= MIN_GROUP_N && afterShare !== null && toPp(beforeShare, afterShare) >= 10) {
    return "지지";
  }
  return "판정 불가";
}

/** H-A5 — 이후 n < 15 판정 불가. 강세군 비율 +10%p 이상 지지, 상승 < 3%p(하락 포함) 기각. */
export function judgeA5(
  beforeN: number,
  afterN: number,
  deltaPp: number | null,
): DiagnosisLabel {
  if (afterN < MIN_GROUP_N || beforeN < MIN_GROUP_N || deltaPp === null) return "판정 불가";
  if (deltaPp >= 10) return "지지";
  if (deltaPp < 3) return "기각";
  return "판정 불가";
}

/** H-B1 — 고유 진입 주 < 6 판정 불가. 구간이 0 포함 또는 전부 < 0 → 지지, 전부 > 0 → 기각. */
export function judgeB1(uniqueWeeks: number, lo: number | null, hi: number | null): DiagnosisLabel {
  if (uniqueWeeks < 6 || lo === null || hi === null) return "판정 불가";
  if (lo > 0) return "기각";
  return "지지";
}

/** H-B2 — 절대 적중률 − 초과 적중률 ≥ 10%p 지지, < 3%p 기각. */
export function judgeB2(diffPp: number | null): DiagnosisLabel {
  if (diffPp === null) return "판정 불가";
  if (diffPp >= 10) return "지지";
  if (diffPp < 3) return "기각";
  return "판정 불가";
}

/**
 * H-B3 — 하위 분위 약세군 n < 15 판정 불가. 조건1(중앙값 차 ≤ −5%p) 그리고 조건2(분위 내 적중 < 찍기) → 지지.
 * 조건1 차이 > −2%p → 기각. 그 외 판정 불가.
 */
export function judgeB3(
  bottomBearN: number,
  medianDiffPp: number | null,
  bottomBearHitRate: number | null,
  bottomDownShare: number | null,
): DiagnosisLabel {
  if (bottomBearN < MIN_GROUP_N || medianDiffPp === null) return "판정 불가";
  const cond2 =
    bottomBearHitRate !== null && bottomDownShare !== null && bottomBearHitRate < bottomDownShare;
  if (medianDiffPp <= -5 && cond2) return "지지";
  if (medianDiffPp > -2) return "기각";
  return "판정 불가";
}
