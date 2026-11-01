/**
 * 스윙 규칙서 v1 오프라인 감사 — 사전 등록 `docs/analysis/swing-rulebook-v1-preregistration.md`(§ 번호는 그 문서).
 *
 *   npx tsx scripts/swing/audit.mts dist atr        # §0 ATR% 분포(수익률 미계산) → 시장별 고변동 경계
 *   npx tsx scripts/swing/audit.mts dist freq       # §0 등급·조건 빈도(수익률 미계산, 전 구간)
 *   npx tsx scripts/swing/audit.mts discovery       # §4 발견 구간 판정 — V1(N=5)·V2(N=10). 홀드아웃 수익률은 계산하지 않는다
 *   npx tsx scripts/swing/audit.mts holdout <V1|V2> # 발견 통과 변형만 — H1·H2·H3 합산
 *   npx tsx scripts/swing/audit.mts stats <V1|V2>   # 결과 문서 커밋 뒤 — 전 구간 과거 통계 → lib/swing/stats-v1.json
 *
 * 입력: scripts/swing/__cache__ (collect.mts). 출력: 콘솔 요약 + __cache__/audit-<mode>.json.
 * 판정 로직은 lib/swing/audit.ts(judge*) — 이 스크립트는 읽기·조립만 한다.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { InvestorTradeDay } from "@/lib/api/kis/investor-flow";
import type { MajorReportItem } from "@/lib/api/dart/disclosure";
import type { SwingEvent } from "@/lib/swing/features";
import { judgeSwing } from "@/lib/swing/judge";
import { simulatePlan } from "@/lib/swing/plan";
import { RULEBOOK, type Rulebook, type SwingMarket } from "@/lib/swing/rulebook";
import {
  AUDIT,
  PERIODS,
  applyCooldown,
  cohortStats,
  dailyMeans,
  forwardReturn,
  isUniverseMember,
  judgeDiscovery,
  judgeHoldout,
  judgePlan,
  periodOf,
  releaseMode,
  weekClusterRateCI,
  type CohortStats,
  type Period,
} from "@/lib/swing/audit";
import { isoWeekKey, mean, median, neweyWestT, quantile, spearman } from "@/lib/server/scorecard/directionDiagnosis";

// SWING_CACHE / SWING_STATS_OUT — 합성 데이터 스모크 테스트용 경로 덮어쓰기(실제 감사는 기본값).
const CACHE = process.env.SWING_CACHE ?? fileURLToPath(new URL("./__cache__/", import.meta.url));
const STATS_OUT = process.env.SWING_STATS_OUT ?? fileURLToPath(new URL("../../lib/swing/stats-v1.json", import.meta.url));
const readJson = <T,>(f: string): T => JSON.parse(fs.readFileSync(f, "utf8")) as T;

type VariantKey = "V1" | "V2";
const VARIANTS: Record<VariantKey, Rulebook> = {
  V1: RULEBOOK,
  V2: { ...RULEBOOK, version: `${RULEBOOK.version}-n10`, flow: { ...RULEBOOK.flow, days: 10 } },
};

const GRADES = ["candidate", "interest", "neutral", "excluded"] as const;
const ITEM_KEYS = ["A1", "A2", "A3", "Aplus", "A", "B", "C", "D", "E"] as const;
const STAGES = ["overheated", "bottoming", "downtrend", "uptrend", "range", "mixed"] as const;
const EXCL = ["insufficient_data", "illiquid", "halted", "spac_reit", "high_volatility", "overheated", "dart_event"] as const;
const MARKETS: SwingMarket[] = ["KOSPI", "KOSDAQ"];
const bit = (k: (typeof ITEM_KEYS)[number]) => 1 << ITEM_KEYS.indexOf(k);

// ── 입력 ─────────────────────────────────────────────────────────────────────
type BarTuple = [string, number, number, number, number, number];
type FlowTuple = [string, number, number, number, number, number, number];
type UniverseSymbol = { ticker: string; name: string; market: SwingMarket };

const universe = readJson<{ meta: unknown; symbols: UniverseSymbol[] }>(`${CACHE}universe.json`);

function loadBars(t: string): StockDailyCandle[] | null {
  const f = `${CACHE}bars/${t}.json`;
  if (!fs.existsSync(f)) return null;
  return readJson<BarTuple[]>(f).map(([date, open, high, low, close, volume]) => ({ date, open, high, low, close, volume }));
}
function loadFlow(t: string): Map<string, InvestorTradeDay> | null {
  const f = `${CACHE}flow/${t}.json`;
  if (!fs.existsSync(f)) return null;
  return new Map(
    readJson<FlowTuple[]>(f).map(([date, tradingValue, person, foreign, institution, pension, privateEquity]) => [
      date,
      { date, tradingValue, person, foreign, institution, pension, privateEquity },
    ]),
  );
}
function loadEvents(): Map<string, SwingEvent[]> {
  const by = new Map<string, SwingEvent[]>();
  for (const f of fs.readdirSync(`${CACHE}dart`).filter((x) => x.endsWith(".json")).sort()) {
    for (const r of readJson<MajorReportItem[]>(`${CACHE}dart/${f}`)) {
      if (!/^\d{6}$/.test(r.stockCode)) continue;
      const arr = by.get(r.stockCode) ?? [];
      arr.push({ date: r.rceptDate, reportName: r.reportName });
      by.set(r.stockCode, arr);
    }
  }
  return by;
}

// ── 관측 테이블(열 저장) ──────────────────────────────────────────────────────
type Row = {
  tk: number; di: number; bi: number; mk: number; pd: number;
  r10: number; r5: number;
  g1: number; b1: number; g2: number; b2: number;
  st: number; ex: number; atrPct: number;
  pS: number; pNet: number; pExit: number; pDays: number; rr: number;
  sP: number; sF: number; sI: number; sPen: number; sPe: number;
};
const COLS: Array<keyof Row> = ["tk", "di", "bi", "mk", "pd", "r10", "r5", "g1", "b1", "g2", "b2", "st", "ex", "atrPct", "pS", "pNet", "pExit", "pDays", "rr", "sP", "sF", "sI", "sPen", "sPe"];

class Table {
  n = 0;
  private cap = 1 << 16;
  cols: Record<keyof Row, Float64Array> = Object.fromEntries(COLS.map((c) => [c, new Float64Array(1 << 16)])) as Record<keyof Row, Float64Array>;
  push(r: Row) {
    if (this.n === this.cap) {
      this.cap *= 2;
      for (const c of COLS) {
        const nu = new Float64Array(this.cap);
        nu.set(this.cols[c]);
        this.cols[c] = nu;
      }
    }
    for (const c of COLS) this.cols[c][this.n] = r[c];
    this.n++;
  }
  get(c: keyof Row, i: number) {
    return this.cols[c][i];
  }
}

const dates: string[] = [];
const dateIdx = new Map<string, number>();
const di = (d: string) => {
  let i = dateIdx.get(d);
  if (i === undefined) {
    i = dates.length;
    dates.push(d);
    dateIdx.set(d, i);
  }
  return i;
};
const PERIOD_KEYS: Period[] = PERIODS.map((p) => p.key);

/**
 * 유니버스 관측 수집 — 요청 구간의 신호일만, 요청 변형만. forward=false 면 수익률·계획 결과를 계산하지 않는다(§0 분포용).
 * 행은 종목별로 날짜 오름차순으로 붙는다(쿨다운 계산이 이 순서에 기댄다).
 */
function collect(periods: Period[], variants: VariantKey[], forward: boolean): Table {
  const table = new Table();
  const events = loadEvents();
  const rb = RULEBOOK; // 유니버스 조건(봉 수·수급 창·유동성)은 변형과 무관.
  let tickers = 0;
  const t0 = Date.now();
  universe.symbols.forEach((s, tkIdx) => {
    const bars = loadBars(s.ticker);
    const flow = bars ? loadFlow(s.ticker) : null;
    if (!bars || !flow) return;
    tickers++;
    const ev = events.get(s.ticker) ?? [];
    for (let i = rb.windowBars - 1; i < bars.length; i++) {
      const date = bars[i].date;
      const p = periodOf(date);
      if (!p || !periods.includes(p)) continue;
      if (!isUniverseMember(bars, flow, i, rb)) continue;
      let r10 = Number.NaN;
      let r5 = Number.NaN;
      if (forward) {
        const f10 = forwardReturn(bars, i, AUDIT.horizon);
        if (f10 === null) continue; // 전진 기간 미완
        r10 = f10;
        r5 = forwardReturn(bars, i, AUDIT.horizonShort) ?? Number.NaN;
      }
      const flowRows: InvestorTradeDay[] = [];
      for (let k = i - rb.flowWindowDays + 1; k <= i; k++) flowRows.push(flow.get(bars[k].date)!);
      const input = { ticker: s.ticker, name: s.name, market: s.market, bars: bars.slice(i - rb.windowBars + 1, i + 1), flow: flowRows, events: ev };
      const j1 = judgeSwing(input, VARIANTS[variants[0]]);
      const j2 = variants[1] ? judgeSwing(input, VARIANTS[variants[1]]) : null;
      const bits = (j: typeof j1) => ITEM_KEYS.reduce((acc, k) => acc | (j.items[k].pass === true ? bit(k) : 0), 0);
      let pS = 0, pNet = Number.NaN, pExit = -1, pDays = 0;
      if (forward && j1.plan) {
        const o = simulatePlan(bars.slice(i + 1, i + 1 + AUDIT.horizon), j1.plan, AUDIT.horizon, AUDIT.costPct);
        if (o?.status === "invalid") pS = 1;
        if (o?.status === "entered") {
          pS = 2;
          pNet = o.netReturn;
          pExit = ["stop", "target", "time"].indexOf(o.exitReason);
          pDays = o.daysHeld;
        }
      }
      const fl = j1.features.flow;
      table.push({
        tk: tkIdx, di: di(date), bi: i, mk: MARKETS.indexOf(s.market), pd: PERIOD_KEYS.indexOf(p),
        r10, r5,
        g1: GRADES.indexOf(j1.grade), b1: bits(j1),
        g2: j2 ? GRADES.indexOf(j2.grade) : -1, b2: j2 ? bits(j2) : 0,
        st: j1.stage === null ? -1 : STAGES.indexOf(j1.stage),
        ex: EXCL.reduce((acc, e, k) => acc | (j1.exclusions.includes(e) ? 1 << k : 0), 0),
        atrPct: j1.features.atrPct ?? Number.NaN,
        pS, pNet, pExit, pDays, rr: j1.plan?.rr ?? Number.NaN,
        sP: fl?.person ?? Number.NaN, sF: fl?.foreign ?? Number.NaN, sI: fl?.institution ?? Number.NaN,
        sPen: fl?.pension ?? Number.NaN, sPe: fl?.privateEquity ?? Number.NaN,
      });
    }
    if (tickers % 200 === 0) console.log(`  … ${tickers}종목 · 관측 ${table.n} · ${((Date.now() - t0) / 60000).toFixed(1)}분`);
  });
  console.log(`수집: 종목 ${tickers} · 관측 ${table.n} · ${((Date.now() - t0) / 60000).toFixed(1)}분`);
  return table;
}

// ── 집계 도구 ────────────────────────────────────────────────────────────────
/** (날짜, 시장) 유니버스 평균 r10·r5·상승 비율. */
function universeBaselines(T: Table) {
  const key = (r: number) => T.get("di", r) * 2 + T.get("mk", r);
  const acc = new Map<number, { s10: number; s5: number; n5: number; up: number; n: number }>();
  for (let r = 0; r < T.n; r++) {
    const k = key(r);
    const a = acc.get(k) ?? { s10: 0, s5: 0, n5: 0, up: 0, n: 0 };
    const r10 = T.get("r10", r);
    const r5 = T.get("r5", r);
    a.s10 += r10;
    a.n += 1;
    if (r10 > 0) a.up += 1;
    if (Number.isFinite(r5)) {
      a.s5 += r5;
      a.n5 += 1;
    }
    acc.set(k, a);
  }
  return {
    mean10: (r: number) => { const a = acc.get(key(r))!; return a.s10 / a.n; },
    mean5: (r: number) => { const a = acc.get(key(r))!; return a.n5 ? a.s5 / a.n5 : Number.NaN; },
    upShare: (r: number) => { const a = acc.get(key(r))!; return a.up / a.n; },
  };
}

/** 술어를 만족하는 행 → 종목별 쿨다운 적용 진입 행. 행은 종목 블록·날짜 오름차순. */
function entriesWhere(T: Table, pred: (r: number) => boolean): number[] {
  const out: number[] = [];
  let r = 0;
  while (r < T.n) {
    const tk = T.get("tk", r);
    const sig: number[] = [];
    const rowsByBar = new Map<number, number>();
    let e = r;
    for (; e < T.n && T.get("tk", e) === tk; e++) {
      if (pred(e)) {
        sig.push(T.get("bi", e));
        rowsByBar.set(T.get("bi", e), e);
      }
    }
    for (const b of applyCooldown(sig, AUDIT.cooldownBars)) out.push(rowsByBar.get(b)!);
    r = e;
  }
  return out;
}

type Cohort = { entries: number; stats: CohortStats };
function cohort(T: Table, rows: number[], value: (r: number) => number): Cohort {
  const pts = rows.map((r) => ({ date: dates[T.get("di", r)], value: value(r) })).filter((p) => Number.isFinite(p.value));
  return { entries: pts.length, stats: cohortStats(dailyMeans(pts)) };
}

const pct = (x: number | null | undefined, d = 3) => (x === null || x === undefined || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(d)}%`);
const fmt = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? "—" : x.toFixed(d));
function printCohort(label: string, c: Cohort) {
  const s = c.stats;
  const years = Object.entries(s.byYear).map(([y, v]) => `${y} ${pct(v.mean)}(${v.days}일)`).join(" · ");
  console.log(`${label.padEnd(26)} 진입 ${String(c.entries).padStart(5)} · 진입일 ${String(s.days).padStart(4)} · 평균 ${pct(s.mean)} · NW t ${fmt(s.nwT)} · 월안정 ${fmt(s.monthStability)} (${s.months}개월) · 일안정 ${fmt(s.dayStability)} · ${years}`);
}

/** 날짜별 Spearman(피처, 10일 초과수익) → 평균 IC·NW t. */
function perDateIC(T: Table, col: keyof Row, excess: (r: number) => number) {
  const byDate = new Map<number, Array<[number, number]>>();
  for (let r = 0; r < T.n; r++) {
    const x = T.get(col, r);
    const y = excess(r);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const d = T.get("di", r);
    const arr = byDate.get(d) ?? [];
    arr.push([x, y]);
    byDate.set(d, arr);
  }
  const ics = [...byDate.entries()]
    .sort((a, b) => dates[a[0]].localeCompare(dates[b[0]]))
    .filter(([, v]) => v.length >= 30)
    .map(([, v]) => spearman(v.map((p) => p[0]), v.map((p) => p[1])))
    .filter((x) => Number.isFinite(x));
  return { days: ics.length, meanIC: mean(ics), nwT: neweyWestT(ics, AUDIT.nwLag) };
}

const has = (T: Table, r: number, b: number, k: (typeof ITEM_KEYS)[number]) => (T.get(b === 1 ? "b1" : "b2", r) & bit(k)) !== 0;

// ── 모드 ─────────────────────────────────────────────────────────────────────
const mode = process.argv[2];
const sub = process.argv[3];

if (mode === "dist" && sub === "atr") {
  const T = collect(["D"], ["V1"], false);
  const out: Record<string, unknown> = {};
  for (const [m, name] of MARKETS.entries()) {
    const xs: number[] = [];
    for (let r = 0; r < T.n; r++) if (T.get("mk", r) === m && Number.isFinite(T.get("atrPct", r))) xs.push(T.get("atrPct", r));
    const qs = [0.33, 0.5, 0.67, 0.8, 0.9].map((q) => quantile(xs, q));
    out[name] = { n: xs.length, p33: qs[0], p50: qs[1], p67: qs[2], p80: qs[3], p90: qs[4] };
    console.log(`${name} ATR14% 분포(발견 구간 유니버스 종목-일 ${xs.length}) p33 ${fmt(qs[0])} · p50 ${fmt(qs[1])} · p67 ${fmt(qs[2])} · p80 ${fmt(qs[3])} · p90 ${fmt(qs[4])}`);
  }
  fs.writeFileSync(`${CACHE}audit-dist-atr.json`, JSON.stringify(out, null, 1));
}

if (mode === "dist" && sub === "freq") {
  const T = collect(PERIOD_KEYS, ["V1", "V2"], false);
  const out: Record<string, unknown> = {};
  for (const [pi, p] of PERIOD_KEYS.entries()) {
    for (const v of [1, 2]) {
      const rowsP: number[] = [];
      for (let r = 0; r < T.n; r++) if (T.get("pd", r) === pi) rowsP.push(r);
      const g = (k: number) => rowsP.filter((r) => T.get(v === 1 ? "g1" : "g2", r) === k).length;
      const cand = entriesWhere(T, (r) => T.get("pd", r) === pi && T.get(v === 1 ? "g1" : "g2", r) === 0);
      const days = new Set(cand.map((r) => T.get("di", r))).size;
      const byMarket = MARKETS.map((m, mi) => `${m} ${cand.filter((r) => T.get("mk", r) === mi).length}`).join(" · ");
      const itemShare = ITEM_KEYS.map((k) => `${k} ${pct(rowsP.filter((r) => has(T, r, v, k)).length / rowsP.length, 1)}`).join(" ");
      const line = `${p} V${v}: 관측 ${rowsP.length} · 후보 ${g(0)} · 관심 ${g(1)} · 관망 ${g(2)} · 제외 ${g(3)} · 쿨다운 진입 ${cand.length}(${days}일; ${byMarket}) · ${itemShare}`;
      console.log(line);
      out[`${p}_V${v}`] = { obs: rowsP.length, grades: GRADES.map((_, k) => g(k)), entries: cand.length, entryDays: days };
    }
  }
  // 수급 강도 분포(발견 구간, V1 N=5) — 참고.
  for (const col of ["sP", "sF", "sI", "sPen", "sPe"] as const) {
    const xs: number[] = [];
    for (let r = 0; r < T.n; r++) if (T.get("pd", r) === 1 && Number.isFinite(T.get(col, r))) xs.push(T.get(col, r));
    console.log(`  S5 ${col} p10/25/50/75/90 = ${[0.1, 0.25, 0.5, 0.75, 0.9].map((q) => fmt(quantile(xs, q), 3)).join(" / ")}`);
  }
  const exShare = EXCL.map((e, k) => {
    let c = 0;
    for (let r = 0; r < T.n; r++) if (T.get("pd", r) === 1 && (T.get("ex", r) & (1 << k))) c++;
    return `${e} ${c}`;
  }).join(" · ");
  console.log(`  발견 구간 제외 사유 건수: ${exShare}`);
  fs.writeFileSync(`${CACHE}audit-dist-freq.json`, JSON.stringify(out, null, 1));
}

/** 발견 판정 결과 묶음 — discovery·stats 모드 공용. */
function discoveryResult(T: Table, base: ReturnType<typeof universeBaselines>, v: 1 | 2) {
  const g = v === 1 ? "g1" : "g2";
  const ex10 = (r: number) => T.get("r10", r) - base.mean10(r);
  const entries = entriesWhere(T, (r) => T.get("pd", r) === 1 && T.get(g, r) === 0);
  const primary = cohort(T, entries, ex10);
  const verdict = judgeDiscovery(primary.entries, primary.stats);
  const byMarket = MARKETS.map((m, mi) => ({ market: m, ...cohort(T, entries.filter((r) => T.get("mk", r) === mi), ex10) }));
  const planRows = entries.filter((r) => T.get("pS", r) === 2);
  const plan = cohort(T, planRows, (r) => T.get("pNet", r) - (base.mean10(r) - AUDIT.costPct / 100));
  const invalid = entries.filter((r) => T.get("pS", r) === 1).length;
  const r5 = cohort(T, entries, (r) => T.get("r5", r) - base.mean5(r));
  return { entries, primary, verdict, byMarket, plan, invalid, r5 };
}

if (mode === "discovery") {
  const T = collect(["D"], ["V1", "V2"], true);
  const base = universeBaselines(T);
  const ex10 = (r: number) => T.get("r10", r) - base.mean10(r);
  const report: Record<string, unknown> = {};
  for (const v of [1, 2] as const) {
    const d = discoveryResult(T, base, v);
    console.log(`\n=== V${v} (N=${v === 1 ? 5 : 10}) — 발견 판정: ${d.verdict.verdict} ===`);
    printCohort("매수 후보(주 지표, 10일)", d.primary);
    for (const c of d.verdict.checks) console.log(`  ${c.pass ? "O" : "x"} ${c.name} ${typeof c.value === "number" ? fmt(c.value, 3) : "—"} (${c.threshold})`);
    for (const m of d.byMarket) printCohort(`  시장 ${m.market}`, m);
    printCohort("계획 경로(비용 차감)", d.plan);
    console.log(`  계획 판정: ${judgePlan(d.plan.stats, null).verdict} · 시가 무효 ${d.invalid}`);
    printCohort("보조 5일", d.r5);
    report[`V${v}`] = {
      verdict: d.verdict,
      primary: d.primary,
      byMarket: d.byMarket,
      plan: { ...d.plan, judge: judgePlan(d.plan.stats, null), invalid: d.invalid },
      r5: d.r5,
    };
  }

  // ── 기술 통계(판정 미사용, V1) ──
  console.log("\n=== 기술 통계(판정 미사용, V1·발견 구간) ===");
  const desc: Record<string, unknown> = {};
  for (const [k, gname] of GRADES.entries()) {
    const rows: number[] = [];
    for (let r = 0; r < T.n; r++) if (T.get("g1", r) === k) rows.push(r);
    const c = cohort(T, rows, ex10);
    printCohort(`등급 ${gname}(전 관측)`, c);
    desc[`grade_${gname}`] = c;
  }
  for (const k of ITEM_KEYS) {
    const notEx = (r: number) => T.get("ex", r) === 0;
    const yes: number[] = [];
    const no: number[] = [];
    for (let r = 0; r < T.n; r++) if (notEx(r)) (has(T, r, 1, k) ? yes : no).push(r);
    const cy = cohort(T, yes, ex10);
    const cn = cohort(T, no, ex10);
    console.log(`조건 ${k.padEnd(6)} 참 평균 ${pct(cy.stats.mean)}(관측 ${cy.entries}) · 거짓 평균 ${pct(cn.stats.mean)}(관측 ${cn.entries})`);
    desc[`item_${k}`] = { yes: cy, no: cn };
  }
  for (const [k, sname] of STAGES.entries()) {
    const rows: number[] = [];
    for (let r = 0; r < T.n; r++) if (T.get("st", r) === k) rows.push(r);
    const c = cohort(T, rows, ex10);
    printCohort(`국면 ${sname}`, c);
    desc[`stage_${sname}`] = c;
  }
  const A = (r: number) => has(T, r, 1, "A");
  const B = (r: number) => has(T, r, 1, "B");
  const C = (r: number) => has(T, r, 1, "C");
  const D = (r: number) => has(T, r, 1, "D");
  const E = (r: number) => has(T, r, 1, "E");
  const ok = (r: number) => T.get("ex", r) === 0;
  const ablations: Record<string, (r: number) => boolean> = {
    "현행 A∧C∧B∧(D∨E)": (r) => ok(r) && A(r) && C(r) && B(r) && (D(r) || E(r)),
    "A 빼기": (r) => ok(r) && C(r) && B(r) && (D(r) || E(r)),
    "B 빼기": (r) => ok(r) && A(r) && C(r) && (D(r) || E(r)),
    "C 빼기": (r) => ok(r) && A(r) && B(r) && (D(r) || E(r)),
    "D∨E 빼기": (r) => ok(r) && A(r) && C(r) && B(r),
    "D 만": (r) => ok(r) && A(r) && C(r) && B(r) && D(r),
    "E 만": (r) => ok(r) && A(r) && C(r) && B(r) && E(r),
    "A 단독": (r) => ok(r) && A(r),
  };
  for (const [name, pred] of Object.entries(ablations)) {
    const c = cohort(T, entriesWhere(T, pred), ex10);
    printCohort(`빼기 ${name}`, c);
    desc[`ablation_${name}`] = c;
  }
  for (const col of ["sP", "sF", "sI", "sPen", "sPe"] as const) {
    const ic = perDateIC(T, col, ex10);
    console.log(`IC ${col.padEnd(4)} ${ic.days}일 평균 ${fmt(ic.meanIC, 4)} · NW t ${fmt(ic.nwT)}`);
    desc[`ic_${col}`] = ic;
  }
  report.descriptive = desc;
  fs.writeFileSync(`${CACHE}audit-discovery.json`, JSON.stringify(report, null, 1));
}

if (mode === "holdout") {
  const vk = (sub === "V2" ? "V2" : "V1") as VariantKey;
  const T = collect(["H1", "H2", "H3"], [vk], true);
  const base = universeBaselines(T);
  const ex10 = (r: number) => T.get("r10", r) - base.mean10(r);
  const entries = entriesWhere(T, (r) => T.get("g1", r) === 0);
  const pooled = cohort(T, entries, ex10);
  const verdict = judgeHoldout(pooled.entries, pooled.stats);
  console.log(`\n=== 홀드아웃 ${vk} (H1·H2·H3 합산) — 판정: ${verdict.verdict} ===`);
  printCohort("매수 후보(10일)", pooled);
  for (const c of verdict.checks) console.log(`  ${c.pass ? "O" : "x"} ${c.name} ${typeof c.value === "number" ? fmt(c.value, 3) : "—"} (${c.threshold})`);
  const sub3 = (["H1", "H2", "H3"] as const).map((p) => ({ period: p, ...cohort(T, entries.filter((r) => T.get("pd", r) === PERIOD_KEYS.indexOf(p)), ex10) }));
  for (const s of sub3) printCohort(`  구간 ${s.period}`, s);
  const byMarket = MARKETS.map((m, mi) => ({ market: m, ...cohort(T, entries.filter((r) => T.get("mk", r) === mi), ex10) }));
  for (const m of byMarket) printCohort(`  시장 ${m.market}`, m);
  const plan = cohort(T, entries.filter((r) => T.get("pS", r) === 2), (r) => T.get("pNet", r) - (base.mean10(r) - AUDIT.costPct / 100));
  printCohort("계획 경로(비용 차감)", plan);
  fs.writeFileSync(`${CACHE}audit-holdout-${vk}.json`, JSON.stringify({ verdict, pooled, sub: sub3, byMarket, plan }, null, 1));
}

if (mode === "stats") {
  const vk = (sub === "V2" ? "V2" : "V1") as VariantKey;
  const T = collect(PERIOD_KEYS, [vk], true);
  const base = universeBaselines(T);
  const ex10 = (r: number) => T.get("r10", r) - base.mean10(r);

  // 출시 형태 — 사전 등록 결정표를 같은 데이터로 다시 계산(결과 문서와 일치해야 한다).
  const dEntries = entriesWhere(T, (r) => T.get("pd", r) === 1 && T.get("g1", r) === 0);
  const dPrimary = cohort(T, dEntries, ex10);
  const dVerdict = judgeDiscovery(dPrimary.entries, dPrimary.stats).verdict;
  let hVerdict: "통과" | "미달" | "판정 불가" | null = null;
  let hPlan: CohortStats | null = null;
  if (dVerdict === "통과") {
    const hEntries = entriesWhere(T, (r) => T.get("pd", r) !== 1 && T.get("g1", r) === 0);
    const hc = cohort(T, hEntries, ex10);
    hVerdict = judgeHoldout(hc.entries, hc.stats).verdict;
    hPlan = cohort(T, hEntries.filter((r) => T.get("pS", r) === 2), (r) => T.get("pNet", r) - (base.mean10(r) - AUDIT.costPct / 100)).stats;
  }
  const dPlan = cohort(T, dEntries.filter((r) => T.get("pS", r) === 2), (r) => T.get("pNet", r) - (base.mean10(r) - AUDIT.costPct / 100)).stats;
  const pooledMode = releaseMode(dVerdict, hVerdict, dVerdict === "통과" && hVerdict === "통과" ? judgePlan(dPlan, hPlan).verdict : null);
  const release: Record<string, string> = {};
  for (const [mi, m] of MARKETS.entries()) {
    const mm = cohort(T, dEntries.filter((r) => T.get("mk", r) === mi), ex10).stats.mean;
    release[m] = mm !== null && mm < 0 ? "checklist" : pooledMode;
  }

  // 셀 — 등급·조건·국면 × 시장 × 연도. 진입(쿨다운) 단위.
  type Cell = Record<string, unknown>;
  const cells: Cell[] = [];
  const years = ["ALL", ...[...new Set(dates.map((d) => d.slice(0, 4)))].sort()];
  const cellOf = (key: Record<string, string>, pred: (r: number) => boolean) => {
    const rows = entriesWhere(T, pred);
    const n = rows.length;
    const r10s = rows.map((r) => T.get("r10", r));
    const weeks = new Map<string, { hits: number; n: number }>();
    for (const r of rows) {
      const w = isoWeekKey(dates[T.get("di", r)]);
      const a = weeks.get(w) ?? { hits: 0, n: 0 };
      a.n += 1;
      if (T.get("r10", r) > 0) a.hits += 1;
      weeks.set(w, a);
    }
    const ci = weekClusterRateCI([...weeks.keys()].sort().map((k) => weeks.get(k)!), 1000, 20261031);
    const planRows = rows.filter((r) => T.get("pS", r) > 0);
    const entered = planRows.filter((r) => T.get("pS", r) === 2);
    const exitShare = (k: number) => (entered.length ? entered.filter((r) => T.get("pExit", r) === k).length / entered.length : null);
    cells.push({
      ...key,
      n,
      days: new Set(rows.map((r) => T.get("di", r))).size,
      hidden: n < 30,
      upRate: n ? r10s.filter((x) => x > 0).length / n : null,
      upRateCI: ci,
      meanR10: mean(r10s),
      medianR10: median(r10s),
      meanExcess10: mean(rows.map(ex10)),
      baseUpRate: mean(rows.map((r) => base.upShare(r))),
      baseMeanR10: mean(rows.map((r) => base.mean10(r))),
      plan: {
        n: planRows.length,
        invalidShare: planRows.length ? (planRows.length - entered.length) / planRows.length : null,
        targetFirst: exitShare(1),
        stopFirst: exitShare(0),
        timeExit: exitShare(2),
        meanNet: mean(entered.map((r) => T.get("pNet", r))),
        meanDaysHeld: mean(entered.map((r) => T.get("pDays", r))),
      },
    });
  };
  const marketPred = (m: string) => (r: number) => m === "ALL" || T.get("mk", r) === MARKETS.indexOf(m as SwingMarket);
  const yearPred = (y: string) => (r: number) => y === "ALL" || dates[T.get("di", r)].startsWith(y);
  for (const m of ["ALL", ...MARKETS]) {
    for (const y of years) {
      for (const [k, gname] of GRADES.entries()) {
        cellOf({ kind: "grade", grade: gname, market: m, year: y }, (r) => marketPred(m)(r) && yearPred(y)(r) && T.get("g1", r) === k);
      }
    }
    for (const k of ITEM_KEYS) {
      for (const val of [true, false]) {
        cellOf({ kind: "item", item: k, value: String(val), market: m, year: "ALL" }, (r) => marketPred(m)(r) && T.get("ex", r) === 0 && has(T, r, 1, k) === val);
      }
    }
    for (const [k, sname] of STAGES.entries()) {
      cellOf({ kind: "stage", stage: sname, market: m, year: "ALL" }, (r) => marketPred(m)(r) && T.get("st", r) === k);
    }
    cellOf({ kind: "universe", market: m, year: "ALL" }, (r) => marketPred(m)(r));
  }
  const out = {
    rulebook: VARIANTS[vk],
    generatedAt: "고정 — 입력 캐시가 같으면 같은 파일(시각 미기록)",
    periods: PERIODS,
    horizon: AUDIT.horizon,
    costPct: AUDIT.costPct,
    cooldownBars: AUDIT.cooldownBars,
    universe: universe.meta,
    release,
    decision: { discovery: dVerdict, holdout: hVerdict, pooledMode },
    cells,
  };
  // 소수는 6자리로 — 재실행 diff 를 줄이고 파일을 가볍게(판정 수치와 무관한 표시용 통계).
  const round6 = (_k: string, v: unknown) => (typeof v === "number" && !Number.isInteger(v) ? Number(v.toFixed(6)) : v);
  fs.writeFileSync(STATS_OUT, `${JSON.stringify(out, round6, 1)}\n`);
  console.log(`stats-v1.json — 셀 ${cells.length} · 출시 ${JSON.stringify(release)} · 결정 ${JSON.stringify(out.decision)}`);
}
