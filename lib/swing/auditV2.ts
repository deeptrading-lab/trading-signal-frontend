/**
 * 스윙 v2 후보 감사 — 순수 집계·판정 함수(IO 없음).
 *
 * 판정 규칙 SSOT = `docs/analysis/swing-v2-candidates-preregistration.md` §4. 여기 judge* 는 그 문장을 코드로
 * 옮긴 것이다 — 결과를 본 뒤 임계값을 바꾸지 않는다. 오프라인 전용.
 *
 * 두 갈래:
 * - 확인(Part A): v1 기술 통계에서 나온 가설 C1·C2 — 발견 구간은 이미 봤으므로 홀드아웃에서만 판정.
 * - 탐색(Part B): 새 데이터 피처 F1~F8 — 발견 구간 IC 판정(E-2 와 같은 틀) → 통과분만 홀드아웃.
 */

import { mean, neweyWestT, spearman } from "@/lib/utils/stats";
import type { Check, DatedValue, Verdict } from "./audit";

export const V2 = {
  /** 탐색 피처 8개 × 양측 → Φ⁻¹(1 − 0.05/16). */
  featureTCrit: 2.73,
  /** 확인 가설 2개 × 양측 → Φ⁻¹(1 − 0.05/4)(v1 과 같은 값). */
  confirmTCrit: 2.24,
  minPerDate: 30,
  nwLag: 9,
  costPct: 0.28,
  discovery: { minDayStability: 0.6 },
  holdout: { minDayStability: 0.55 },
  confirm: { minEntries: 100, minMonthShare: 0.55 },
} as const;

export type FeatureObs = { date: string; ticker: string; x: number; y: number };

/** 날짜별 Spearman IC 와 상·하위 십분위 초과수익 차(십분위 = floor(n/10), 동점은 종목코드 순 — 결정성). */
export function featureDateStats(obs: FeatureObs[], minPerDate: number = V2.minPerDate) {
  const by = new Map<string, FeatureObs[]>();
  for (const o of obs) {
    if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) continue;
    const arr = by.get(o.date) ?? [];
    arr.push(o);
    by.set(o.date, arr);
  }
  const out: Array<{ date: string; ic: number; spread: number; n: number }> = [];
  for (const [date, arr] of [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (arr.length < minPerDate) continue;
    const ic = spearman(arr.map((o) => o.x), arr.map((o) => o.y));
    if (!Number.isFinite(ic)) continue;
    const sorted = [...arr].sort((a, b) => a.x - b.x || a.ticker.localeCompare(b.ticker));
    const k = Math.floor(sorted.length / 10);
    const lo = mean(sorted.slice(0, k).map((o) => o.y))!;
    const hi = mean(sorted.slice(-k).map((o) => o.y))!;
    out.push({ date, ic, spread: hi - lo, n: arr.length });
  }
  return out;
}

export type FeatureSummary = {
  days: number;
  meanIC: number | null;
  nwT: number;
  /** 상위 − 하위 십분위 초과수익 평균(소수). */
  spread: number | null;
  /** 날짜 스프레드가 양(+)인 날 비율. */
  posDays: number | null;
  icByYear: Record<string, number | null>;
};

export function summarizeFeature(perDate: ReturnType<typeof featureDateStats>): FeatureSummary {
  const ics = perDate.map((p) => p.ic);
  const years = new Map<string, number[]>();
  for (const p of perDate) years.set(p.date.slice(0, 4), [...(years.get(p.date.slice(0, 4)) ?? []), p.ic]);
  const icByYear: Record<string, number | null> = {};
  for (const [y, v] of [...years.entries()].sort()) icByYear[y] = mean(v);
  return {
    days: perDate.length,
    meanIC: mean(ics),
    nwT: ics.length > 1 ? neweyWestT(ics, V2.nwLag) : Number.NaN,
    spread: mean(perDate.map((p) => p.spread)),
    posDays: perDate.length ? perDate.filter((p) => p.spread > 0).length / perDate.length : null,
    icByYear,
  };
}

const signOk = (x: number | null, s: 1 | -1) => x !== null && Number.isFinite(x) && Math.sign(x) === s;

/** 탐색 피처 발견 판정(방향 s) — 4개 전부: IC 부호·|NW t| ≥ 2.73, s×스프레드 ≥ 0.28%, 일자 안정성 ≥ 60%, 2024·2025 IC 부호. */
export function judgeFeatureDiscovery(f: FeatureSummary, s: 1 | -1): { pass: boolean; checks: Check[] } {
  const stab = f.posDays === null ? null : s === 1 ? f.posDays : 1 - f.posDays;
  const checks: Check[] = [
    { name: "IC 부호·NW t", value: f.nwT, threshold: `부호 ${s > 0 ? "+" : "−"} · |t| ≥ ${V2.featureTCrit}`, pass: signOk(f.meanIC, s) && Math.abs(f.nwT) >= V2.featureTCrit },
    { name: "s×스프레드 %", value: f.spread === null ? null : s * f.spread * 100, threshold: `≥ ${V2.costPct}`, pass: f.spread !== null && s * f.spread * 100 >= V2.costPct },
    { name: "일자 안정성", value: stab, threshold: `≥ ${V2.discovery.minDayStability}`, pass: stab !== null && stab >= V2.discovery.minDayStability },
    { name: "2024·2025 IC 부호", value: null, threshold: `둘 다 ${s > 0 ? "+" : "−"}`, pass: signOk(f.icByYear["2024"] ?? null, s) && signOk(f.icByYear["2025"] ?? null, s) },
  ];
  return { pass: checks.every((c) => c.pass), checks };
}

/** 탐색 피처 홀드아웃 판정(발견 통과 방향만) — IC 부호, 일자 안정성 ≥ 55%, s×스프레드 > 0. */
export function judgeFeatureHoldout(f: FeatureSummary, s: 1 | -1): { pass: boolean; checks: Check[] } {
  const stab = f.posDays === null ? null : s === 1 ? f.posDays : 1 - f.posDays;
  const checks: Check[] = [
    { name: "IC 부호", value: f.meanIC, threshold: s > 0 ? "> 0" : "< 0", pass: signOk(f.meanIC, s) },
    { name: "일자 안정성", value: stab, threshold: `≥ ${V2.holdout.minDayStability}`, pass: stab !== null && stab >= V2.holdout.minDayStability },
    { name: "s×스프레드", value: f.spread === null ? null : s * f.spread * 100, threshold: "> 0", pass: f.spread !== null && s * f.spread > 0 },
  ];
  return { pass: checks.every((c) => c.pass), checks };
}

/**
 * 확인 가설 판정(홀드아웃) — 방향 s 의 날짜 계열(진입 쿨다운 후 날짜 평균).
 * 진입 < 100 이면 판정 불가. 아니면: 평균 부호 = s, s×NW t ≥ 2.24, 달 평균 부호가 s 인 달 비율 ≥ 55%.
 */
export function judgeConfirm(series: DatedValue[], entries: number, s: 1 | -1): { verdict: Verdict; checks: Check[]; meanPct: number | null; nwT: number; monthShare: number | null } {
  const xs = series.map((p) => p.value);
  const m = mean(xs);
  const t = xs.length > 1 ? neweyWestT(xs, V2.nwLag) : Number.NaN;
  const months = new Map<string, number[]>();
  for (const p of series) months.set(p.date.slice(0, 7), [...(months.get(p.date.slice(0, 7)) ?? []), p.value]);
  const mm = [...months.values()].map((v) => mean(v)!);
  const monthShare = mm.length ? mm.filter((v) => Math.sign(v) === s).length / mm.length : null;
  const checks: Check[] = [{ name: "진입 수", value: entries, threshold: `≥ ${V2.confirm.minEntries}`, pass: entries >= V2.confirm.minEntries }];
  if (!checks[0].pass) return { verdict: "판정 불가", checks, meanPct: m === null ? null : m * 100, nwT: t, monthShare };
  checks.push(
    { name: "평균 %", value: m === null ? null : m * 100, threshold: s > 0 ? "> 0" : "< 0", pass: signOk(m, s) },
    { name: "s×NW t", value: s * t, threshold: `≥ ${V2.confirmTCrit}`, pass: Number.isFinite(t) && s * t >= V2.confirmTCrit },
    { name: "부호 맞는 달 비율", value: monthShare, threshold: `≥ ${V2.confirm.minMonthShare}`, pass: monthShare !== null && monthShare >= V2.confirm.minMonthShare },
  );
  return { verdict: checks.every((c) => c.pass) ? "통과" : "미달", checks, meanPct: m === null ? null : m * 100, nwT: t, monthShare };
}
