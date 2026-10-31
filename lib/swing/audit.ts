/**
 * 스윙 규칙서 오프라인 감사 — 순수 집계·판정 함수(IO 없음).
 *
 * 판정 규칙 SSOT = `docs/analysis/swing-rulebook-v1-preregistration.md`. 여기 judge* 는 사전 등록 §4 문장을
 * 코드로 옮긴 것이다 — 결과를 본 뒤 임계값을 바꾸지 않는다. 오프라인 전용(라이브 경로에서 import 금지).
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { InvestorTradeDay } from "@/lib/api/kis/investor-flow";
import { mean, median, mulberry32, neweyWestT, quantile, toPp } from "@/lib/server/scorecard/directionDiagnosis";
import type { Rulebook } from "./rulebook";

/** 사전 등록 §3 상수. */
export const AUDIT = {
  /** 주 수익 기간(거래일) — t+1 시가 → t+10 종가. */
  horizon: 10,
  /** 보조 수익 기간. */
  horizonShort: 5,
  /** 왕복 비용 %. */
  costPct: 0.28,
  /** 같은 종목 재진입 금지 봉 수. */
  cooldownBars: 10,
  /** Newey-West lag = 수익 겹침 − 1. */
  nwLag: 9,
  /** Bonferroni(변형 2 × 양측) 임계 t = Φ⁻¹(1 − 0.05/4). */
  tCrit: 2.24,
} as const;

export type Period = "H1" | "D" | "H2" | "H3";

/** 신호일 t 기준 구간(양 끝 포함). H1 = 2022–2023(수급 조회 깊이 확인 후 확장), H3 = 아무도 본 적 없는 전진 구간. */
export const PERIODS: ReadonlyArray<{ key: Period; from: string; to: string }> = [
  { key: "H1", from: "2022-01-01", to: "2023-12-31" },
  { key: "D", from: "2024-01-01", to: "2025-12-31" },
  { key: "H2", from: "2026-01-01", to: "2026-08-10" },
  { key: "H3", from: "2026-08-11", to: "2026-10-16" },
];

export function periodOf(date: string): Period | null {
  for (const p of PERIODS) if (date >= p.from && date <= p.to) return p.key;
  return null;
}

/**
 * 유니버스 소속 — 판정의 `insufficient_data`·`illiquid` 제외와 같은 조건(봉 수·수급 완결·유동성).
 * 같은 날 같은 시장 유니버스 평균이 초과수익의 기준선이다.
 */
export function isUniverseMember(
  bars: StockDailyCandle[],
  flowByDate: Map<string, InvestorTradeDay>,
  i: number,
  rb: Rulebook,
): boolean {
  if (i < rb.windowBars - 1) return false;
  if (bars[i].close < rb.liquidity.minClose) return false;
  let tv = 0;
  for (let k = i - rb.flowWindowDays + 1; k <= i; k++) {
    const f = flowByDate.get(bars[k].date);
    if (!f) return false;
    tv += f.tradingValue;
  }
  return tv / rb.flowWindowDays >= rb.liquidity.minAdv20Won;
}

/** t+1 시가 → t+h 종가 수익(소수). 봉이 모자라거나 시가가 0 이하면 null. */
export function forwardReturn(bars: StockDailyCandle[], i: number, h: number): number | null {
  if (i + h >= bars.length) return null;
  const entry = bars[i + 1].open;
  if (!(entry > 0)) return null;
  return bars[i + h].close / entry - 1;
}

/** 진입 — 같은 종목 cooldown 봉 안의 재신호는 버린다. 입력은 신호 봉 인덱스(오름차순). */
export function applyCooldown(signalIdx: number[], cooldown: number): number[] {
  const out: number[] = [];
  for (const i of signalIdx) {
    if (out.length === 0 || i - out[out.length - 1] >= cooldown) out.push(i);
  }
  return out;
}

export type DatedValue = { date: string; value: number };

/** 날짜별 평균(진입이 여러 개인 날은 그날 평균 하나로). 날짜 오름차순. */
export function dailyMeans(points: DatedValue[]): Array<DatedValue & { n: number }> {
  const by = new Map<string, { s: number; n: number }>();
  for (const p of points) {
    const g = by.get(p.date) ?? { s: 0, n: 0 };
    g.s += p.value;
    g.n += 1;
    by.set(p.date, g);
  }
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, g]) => ({ date, value: g.s / g.n, n: g.n }));
}

export type CohortStats = {
  /** 진입일(날짜 계열 길이). */
  days: number;
  /** 날짜 평균의 평균(소수). */
  mean: number | null;
  median: number | null;
  nwT: number;
  /** 월 평균이 양(+)인 달 비율. */
  monthStability: number | null;
  months: number;
  /** 날짜 계열이 양(+)인 날 비율(참고). */
  dayStability: number | null;
  byYear: Record<string, { days: number; mean: number | null }>;
};

/** 날짜 계열(이미 날짜별 평균) → 평균·NW t·월 안정성·연도별. */
export function cohortStats(series: DatedValue[], nwLag: number = AUDIT.nwLag): CohortStats {
  const xs = series.map((s) => s.value);
  const byMonth = new Map<string, number[]>();
  const byYearMap = new Map<string, number[]>();
  for (const s of series) {
    const m = s.date.slice(0, 7);
    const y = s.date.slice(0, 4);
    byMonth.set(m, [...(byMonth.get(m) ?? []), s.value]);
    byYearMap.set(y, [...(byYearMap.get(y) ?? []), s.value]);
  }
  const monthMeans = [...byMonth.values()].map((v) => mean(v)!);
  const byYear: CohortStats["byYear"] = {};
  for (const [y, v] of [...byYearMap.entries()].sort()) byYear[y] = { days: v.length, mean: mean(v) };
  return {
    days: xs.length,
    mean: mean(xs),
    median: median(xs),
    nwT: xs.length > 1 ? neweyWestT(xs, nwLag) : Number.NaN,
    monthStability: monthMeans.length ? monthMeans.filter((v) => v > 0).length / monthMeans.length : null,
    months: monthMeans.length,
    dayStability: xs.length ? xs.filter((v) => v > 0).length / xs.length : null,
    byYear,
  };
}

/**
 * 비율의 주(週) 클러스터 부트스트랩 95% 구간 — 주별 (성공 수, 표본 수)를 복원 추출해 Σ성공/Σ표본.
 * 행을 이어 붙이는 `clusterBootstrapCI` 와 같은 통계량을 주 단위 합으로 빠르게 잰다(표본이 큰 셀용).
 */
export function weekClusterRateCI(
  weeks: Array<{ hits: number; n: number }>,
  iterations: number,
  seed: number,
): { lo: number | null; hi: number | null } {
  if (weeks.length === 0) return { lo: null, hi: null };
  const rand = mulberry32(seed);
  const rates: number[] = [];
  for (let b = 0; b < iterations; b++) {
    let hits = 0;
    let n = 0;
    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[Math.floor(rand() * weeks.length)];
      hits += w.hits;
      n += w.n;
    }
    if (n > 0) rates.push(hits / n);
  }
  return { lo: quantile(rates, 0.025), hi: quantile(rates, 0.975) };
}

// ── 판정(사전 등록 §4) ───────────────────────────────────────────────────────

export type Check = { name: string; value: number | null; threshold: string; pass: boolean };
export type Verdict = "통과" | "미달" | "판정 불가";

export const DISCOVERY_RULE = {
  minEntries: 300,
  minEntryDays: 150,
  minMeanPct: 0.28,
  minMonthStability: 0.6,
  years: ["2024", "2025"],
} as const;

export const HOLDOUT_RULE = { minEntries: 100, minMonthStability: 0.55 } as const;
export const PLAN_RULE = { minMonthStability: 0.55 } as const;

/** 발견 구간 판정 — 진입·진입일 부족이면 판정 불가, 아니면 5개 조건 모두 충족해야 통과. */
export function judgeDiscovery(
  entries: number,
  stats: CohortStats,
  tCrit: number = AUDIT.tCrit,
): { verdict: Verdict; checks: Check[] } {
  const r = DISCOVERY_RULE;
  const checks: Check[] = [
    { name: "진입 수", value: entries, threshold: `≥ ${r.minEntries}`, pass: entries >= r.minEntries },
    { name: "진입일 수", value: stats.days, threshold: `≥ ${r.minEntryDays}`, pass: stats.days >= r.minEntryDays },
  ];
  if (!checks.every((c) => c.pass)) return { verdict: "판정 불가", checks };
  // %p 환산은 toPp 로 소수 6자리 반올림 — 0.0028×100 = 0.27999… 같은 부동소수 오차로 경계가 어긋나지 않게.
  const meanPct = stats.mean === null ? null : toPp(stats.mean, 0);
  checks.push(
    { name: "평균 초과수익 %", value: meanPct, threshold: `≥ ${r.minMeanPct}`, pass: meanPct !== null && meanPct >= r.minMeanPct },
    { name: "NW t", value: stats.nwT, threshold: `≥ ${tCrit}`, pass: Number.isFinite(stats.nwT) && stats.nwT >= tCrit },
    {
      name: "월 안정성",
      value: stats.monthStability,
      threshold: `≥ ${r.minMonthStability}`,
      pass: stats.monthStability !== null && stats.monthStability >= r.minMonthStability,
    },
    ...r.years.map((y) => {
      const m = stats.byYear[y]?.mean ?? null;
      return { name: `${y} 평균`, value: m === null ? null : m * 100, threshold: "> 0", pass: m !== null && m > 0 };
    }),
  );
  return { verdict: checks.every((c) => c.pass) ? "통과" : "미달", checks };
}

/** 홀드아웃 판정 — H1·H2·H3 합산. */
export function judgeHoldout(entries: number, stats: CohortStats): { verdict: Verdict; checks: Check[] } {
  const r = HOLDOUT_RULE;
  const checks: Check[] = [
    { name: "진입 수", value: entries, threshold: `≥ ${r.minEntries}`, pass: entries >= r.minEntries },
  ];
  if (!checks[0].pass) return { verdict: "판정 불가", checks };
  checks.push(
    { name: "평균 초과수익 %", value: stats.mean === null ? null : stats.mean * 100, threshold: "> 0", pass: stats.mean !== null && stats.mean > 0 },
    {
      name: "월 안정성",
      value: stats.monthStability,
      threshold: `≥ ${r.minMonthStability}`,
      pass: stats.monthStability !== null && stats.monthStability >= r.minMonthStability,
    },
  );
  return { verdict: checks.every((c) => c.pass) ? "통과" : "미달", checks };
}

/** 계획 경로 판정 — 발견(필수) + 홀드아웃(돌렸다면) 평균 > 0, 발견 월 안정성 ≥ 55%. */
export function judgePlan(discovery: CohortStats, holdout: CohortStats | null): { verdict: Verdict; checks: Check[] } {
  const checks: Check[] = [
    { name: "발견 평균 %", value: discovery.mean === null ? null : discovery.mean * 100, threshold: "> 0", pass: discovery.mean !== null && discovery.mean > 0 },
    {
      name: "발견 월 안정성",
      value: discovery.monthStability,
      threshold: `≥ ${PLAN_RULE.minMonthStability}`,
      pass: discovery.monthStability !== null && discovery.monthStability >= PLAN_RULE.minMonthStability,
    },
  ];
  if (holdout) {
    checks.push({ name: "홀드아웃 평균 %", value: holdout.mean === null ? null : holdout.mean * 100, threshold: "> 0", pass: holdout.mean !== null && holdout.mean > 0 });
  }
  return { verdict: checks.every((c) => c.pass) ? "통과" : "미달", checks };
}

export type ReleaseMode = "graded" | "graded_reference_levels" | "checklist";

/** 사전 등록 §4 결정표. 시장별 발견 평균이 음(−)이면 그 시장은 checklist(호출부가 적용). */
export function releaseMode(discovery: Verdict, holdout: Verdict | null, plan: Verdict | null): ReleaseMode {
  if (discovery !== "통과" || holdout !== "통과") return "checklist";
  return plan === "통과" ? "graded" : "graded_reference_levels";
}
