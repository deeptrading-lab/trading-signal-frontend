/**
 * 스윙 v2 후보 감사 — 사전 등록 `docs/analysis/swing-v2-candidates-preregistration.md`(§ 번호는 그 문서).
 *
 *   npx tsx scripts/swing/audit-v2.mts dist        # §0 피처 커버리지·분포·확인 가설 진입 수(수익률 미계산)
 *   npx tsx scripts/swing/audit-v2.mts discovery   # §4 탐색 피처 F1~F8 발견 판정(발견 구간 D 만)
 *   npx tsx scripts/swing/audit-v2.mts holdout     # §4 확인 가설 C1·C2 + 발견 통과 피처 — H1·H2·H3
 *
 * 입력: scripts/swing/__cache__ (collect.mts — bars·flow·flowx·credit·program·extra/opinion·dart).
 * 판정 로직은 lib/swing/auditV2.ts — 이 스크립트는 읽기·조립만 한다. v1 감사(audit.mts)는 건드리지 않는다.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { InvestorTradeDay } from "@/lib/api/kis/investor-flow";
import type { MajorReportItem } from "@/lib/api/dart/disclosure";
import type { SwingEvent } from "@/lib/swing/features";
import { judgeSwing } from "@/lib/swing/judge";
import { RULEBOOK, type SwingMarket } from "@/lib/swing/rulebook";
import { AUDIT, applyCooldown, dailyMeans, forwardReturn, isUniverseMember, periodOf, type Period } from "@/lib/swing/audit";
import { CANDIDATES, computeCandidateSeries, type CandidateKey, type CreditTuple, type FlowxTuple, type Opinion, type ProgramTuple } from "@/lib/swing/candidates";
import { featureDateStats, judgeConfirm, judgeFeatureDiscovery, judgeFeatureHoldout, summarizeFeature } from "@/lib/swing/auditV2";
import { quantile } from "@/lib/server/scorecard/directionDiagnosis";

const CACHE = process.env.SWING_CACHE ?? fileURLToPath(new URL("./__cache__/", import.meta.url));
const readJson = <T,>(f: string): T => JSON.parse(fs.readFileSync(f, "utf8")) as T;
const readOr = <T,>(f: string, fallback: T): T => (fs.existsSync(f) ? readJson<T>(f) : fallback);

type BarTuple = [string, number, number, number, number, number];
type FlowTuple = [string, number, number, number, number, number, number];
type UniverseSymbol = { ticker: string; name: string; market: SwingMarket };
const universe = readJson<{ symbols: UniverseSymbol[] }>(`${CACHE}universe.json`);
const MARKETS: SwingMarket[] = ["KOSPI", "KOSDAQ"];
const KEYS = CANDIDATES.map((c) => c.key);

function loadEvents(): Map<string, SwingEvent[]> {
  const by = new Map<string, SwingEvent[]>();
  for (const f of fs.readdirSync(`${CACHE}dart`).filter((x) => x.endsWith(".json")).sort()) {
    for (const r of readJson<MajorReportItem[]>(`${CACHE}dart/${f}`)) {
      if (!/^\d{6}$/.test(r.stockCode)) continue;
      by.set(r.stockCode, [...(by.get(r.stockCode) ?? []), { date: r.rceptDate, reportName: r.reportName }]);
    }
  }
  return by;
}

type Row = {
  ticker: string; bi: number; date: string; market: SwingMarket; period: Period;
  r10: number; excluded: boolean; A: boolean;
  f: Record<CandidateKey, number | null>;
};

/** 유니버스 관측 — 요청 구간만. forward=false 면 수익률을 계산하지 않는다(§0). 행은 종목 블록·날짜 오름차순. */
function collect(periods: Period[], forward: boolean): Row[] {
  const rows: Row[] = [];
  const events = loadEvents();
  const rb = RULEBOOK;
  const t0 = Date.now();
  let tickers = 0;
  for (const s of universe.symbols) {
    const bf = `${CACHE}bars/${s.ticker}.json`;
    const ff = `${CACHE}flow/${s.ticker}.json`;
    if (!fs.existsSync(bf) || !fs.existsSync(ff)) continue;
    tickers++;
    const bars: StockDailyCandle[] = readJson<BarTuple[]>(bf).map(([date, open, high, low, close, volume]) => ({ date, open, high, low, close, volume }));
    const flow = new Map<string, InvestorTradeDay>(
      readJson<FlowTuple[]>(ff).map(([date, tradingValue, person, foreign, institution, pension, privateEquity]) => [date, { date, tradingValue, person, foreign, institution, pension, privateEquity }]),
    );
    const series = computeCandidateSeries(
      bars.map((b) => b.date),
      bars.map((b) => b.close),
      readOr<FlowxTuple[]>(`${CACHE}flowx/${s.ticker}.json`, []),
      readOr<CreditTuple[]>(`${CACHE}credit/${s.ticker}.json`, []),
      readOr<ProgramTuple[]>(`${CACHE}program/${s.ticker}.json`, []),
      readOr<Opinion[]>(`${CACHE}extra/opinion_${s.ticker}.json`, []),
    );
    const ev = events.get(s.ticker) ?? [];
    for (let i = rb.windowBars - 1; i < bars.length; i++) {
      const p = periodOf(bars[i].date);
      if (!p || !periods.includes(p)) continue;
      if (!isUniverseMember(bars, flow, i, rb)) continue;
      let r10 = Number.NaN;
      if (forward) {
        const f10 = forwardReturn(bars, i, AUDIT.horizon);
        if (f10 === null) continue;
        r10 = f10;
      }
      const flowRows: InvestorTradeDay[] = [];
      for (let k = i - rb.flowWindowDays + 1; k <= i; k++) flowRows.push(flow.get(bars[k].date)!);
      const j = judgeSwing({ ticker: s.ticker, name: s.name, market: s.market, bars: bars.slice(i - rb.windowBars + 1, i + 1), flow: flowRows, events: ev });
      const f = {} as Record<CandidateKey, number | null>;
      for (const k of KEYS) f[k] = series[k][i];
      rows.push({ ticker: s.ticker, bi: i, date: bars[i].date, market: s.market, period: p, r10, excluded: j.exclusions.length > 0, A: j.items.A.pass === true, f });
    }
    if (tickers % 400 === 0) console.log(`  … ${tickers}종목 · 관측 ${rows.length} · ${((Date.now() - t0) / 60000).toFixed(1)}분`);
  }
  console.log(`수집: 종목 ${tickers} · 관측 ${rows.length} · ${((Date.now() - t0) / 60000).toFixed(1)}분`);
  return rows;
}

/** (날짜, 시장) 평균 r10 — 전체 유니버스 / 제외 아닌 종목. */
function baselines(rows: Row[]) {
  const all = new Map<string, { s: number; n: number }>();
  const nx = new Map<string, { s: number; n: number }>();
  const add = (m: Map<string, { s: number; n: number }>, k: string, v: number) => {
    const a = m.get(k) ?? { s: 0, n: 0 };
    a.s += v;
    a.n += 1;
    m.set(k, a);
  };
  for (const r of rows) {
    const k = `${r.date}|${r.market}`;
    add(all, k, r.r10);
    if (!r.excluded) add(nx, k, r.r10);
  }
  const get = (m: Map<string, { s: number; n: number }>, r: Row) => {
    const a = m.get(`${r.date}|${r.market}`);
    return a ? a.s / a.n : Number.NaN;
  };
  return { all: (r: Row) => get(all, r), nonExcluded: (r: Row) => get(nx, r) };
}

/** 술어 → 종목별 쿨다운 진입 행. */
function entries(rows: Row[], pred: (r: Row) => boolean): Row[] {
  const out: Row[] = [];
  let i = 0;
  while (i < rows.length) {
    let e = i;
    const sig: Row[] = [];
    while (e < rows.length && rows[e].ticker === rows[i].ticker) {
      if (pred(rows[e])) sig.push(rows[e]);
      e++;
    }
    const keep = new Set(applyCooldown(sig.map((r) => r.bi), AUDIT.cooldownBars));
    for (const r of sig) if (keep.has(r.bi)) out.push(r);
    i = e;
  }
  return out;
}

const fmt = (x: number | null | undefined, d = 3) => (x === null || x === undefined || !Number.isFinite(x) ? "—" : x.toFixed(d));
const pct = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(3)}%`);

function featureReport(rows: Row[], excess: (r: Row) => number) {
  const out: Record<string, unknown> = {};
  for (const c of CANDIDATES) {
    const obs = rows.filter((r) => r.f[c.key] !== null).map((r) => ({ date: r.date, ticker: r.ticker, x: r.f[c.key] as number, y: excess(r) }));
    const summary = summarizeFeature(featureDateStats(obs));
    out[c.key] = { label: c.label, obs: obs.length, summary };
    console.log(`${c.key} ${c.label.padEnd(18)} 관측 ${String(obs.length).padStart(7)} · ${summary.days}일 · IC ${fmt(summary.meanIC, 4)} · NW t ${fmt(summary.nwT, 2)} · 스프레드 ${pct(summary.spread)} · +날 ${fmt(summary.posDays, 2)} · 연도 ${Object.entries(summary.icByYear).map(([y, v]) => `${y} ${fmt(v, 4)}`).join(" ")}`);
  }
  return out as Record<CandidateKey, { label: string; obs: number; summary: ReturnType<typeof summarizeFeature> }>;
}

const mode = process.argv[2];

if (mode === "dist") {
  const all = collect(["H1", "D", "H2", "H3"], false);
  const d = all.filter((r) => r.period === "D");
  for (const c of CANDIDATES) {
    const xs = d.map((r) => r.f[c.key]).filter((x): x is number => x !== null);
    console.log(`${c.key} ${c.label.padEnd(18)} 발견 커버리지 ${(xs.length / d.length * 100).toFixed(1)}% (${xs.length}/${d.length}) · p10/25/50/75/90 ${[0.1, 0.25, 0.5, 0.75, 0.9].map((q) => fmt(quantile(xs, q), 4)).join(" / ")}`);
  }
  for (const p of ["H1", "D", "H2", "H3"] as Period[]) {
    const rp = all.filter((r) => r.period === p);
    const c1 = entries(rp, (r) => r.excluded).length;
    const c2 = entries(rp, (r) => !r.excluded && r.A).length;
    console.log(`${p}: 관측 ${rp.length} · C1(제외) 진입 ${c1} · C2(제외 아님∧A) 진입 ${c2}`);
  }
}

if (mode === "discovery") {
  const rows = collect(["D"], true);
  const base = baselines(rows);
  console.log("\n=== 탐색 피처 발견 판정(D, 10일 초과수익 = 같은 날·시장 유니버스 차감) ===");
  const rep = featureReport(rows, (r) => r.r10 - base.all(r));
  const result: Record<string, unknown> = {};
  for (const c of CANDIDATES) {
    const s = rep[c.key].summary;
    const pos = judgeFeatureDiscovery(s, 1);
    const neg = judgeFeatureDiscovery(s, -1);
    const pass = pos.pass ? 1 : neg.pass ? -1 : 0;
    console.log(`  ${c.key} 정 ${pos.checks.map((x) => (x.pass ? "O" : "x")).join("")} · 역 ${neg.checks.map((x) => (x.pass ? "O" : "x")).join("")} → ${pass === 1 ? "정방향 통과" : pass === -1 ? "역방향 통과" : "불통과"}`);
    result[c.key] = { ...rep[c.key], pos, neg, pass };
  }
  fs.writeFileSync(`${CACHE}audit-v2-discovery.json`, JSON.stringify(result, null, 1));
}

if (mode === "holdout") {
  const disc = readJson<Record<CandidateKey, { pass: 1 | -1 | 0 }>>(`${CACHE}audit-v2-discovery.json`);
  const rows = collect(["H1", "H2", "H3"], true);
  const base = baselines(rows);
  const out: Record<string, unknown> = {};

  console.log("\n=== 확인 가설(H1·H2·H3 합산) ===");
  const conf = [
    { key: "C1", label: "제외 집단 저조", s: -1 as const, pred: (r: Row) => r.excluded, y: (r: Row) => r.r10 - base.all(r) },
    { key: "C2", label: "수급 동시 조건 증분(제외 아님 대비)", s: 1 as const, pred: (r: Row) => !r.excluded && r.A, y: (r: Row) => r.r10 - base.nonExcluded(r) },
  ];
  for (const c of conf) {
    const en = entries(rows, c.pred);
    const series = dailyMeans(en.map((r) => ({ date: r.date, value: c.y(r) })));
    const j = judgeConfirm(series, en.length, c.s);
    console.log(`${c.key} ${c.label}: ${j.verdict} · 진입 ${en.length} · 진입일 ${series.length} · 평균 ${fmt(j.meanPct)}% · NW t ${fmt(j.nwT, 2)} · 부호 맞는 달 ${fmt(j.monthShare, 2)}`);
    for (const x of j.checks) console.log(`   ${x.pass ? "O" : "x"} ${x.name} ${fmt(x.value)} (${x.threshold})`);
    const sub: Record<string, unknown> = {};
    for (const g of [...(["H1", "H2", "H3"] as Period[]).map((p) => ({ name: p, f: (r: Row) => r.period === p })), ...MARKETS.map((m) => ({ name: m, f: (r: Row) => r.market === m }))]) {
      const e2 = en.filter(g.f);
      const s2 = dailyMeans(e2.map((r) => ({ date: r.date, value: c.y(r) })));
      const j2 = judgeConfirm(s2, e2.length, c.s);
      sub[g.name] = { entries: e2.length, days: s2.length, meanPct: j2.meanPct, nwT: j2.nwT, monthShare: j2.monthShare };
      console.log(`   ${g.name.padEnd(6)} 진입 ${e2.length} · 평균 ${fmt(j2.meanPct)}% · NW t ${fmt(j2.nwT, 2)} · 부호 맞는 달 ${fmt(j2.monthShare, 2)}`);
    }
    out[c.key] = { label: c.label, verdict: j, sub };
  }

  console.log("\n=== 탐색 피처 홀드아웃(발견 통과 방향만) ===");
  const passers = CANDIDATES.filter((c) => disc[c.key]?.pass);
  if (passers.length === 0) console.log("발견 통과 피처 없음 — 계산하지 않음(사전 등록 §4).");
  for (const c of passers) {
    const s = disc[c.key].pass as 1 | -1;
    const obs = rows.filter((r) => r.f[c.key] !== null).map((r) => ({ date: r.date, ticker: r.ticker, x: r.f[c.key] as number, y: r.r10 - base.all(r) }));
    const summary = summarizeFeature(featureDateStats(obs));
    const j = judgeFeatureHoldout(summary, s);
    console.log(`${c.key} ${c.label} (${s > 0 ? "정" : "역"}): ${j.pass ? "통과" : "미달"} · IC ${fmt(summary.meanIC, 4)} · +날 ${fmt(summary.posDays, 2)} · 스프레드 ${pct(summary.spread)}`);
    out[c.key] = { s, summary, judge: j };
  }
  fs.writeFileSync(`${CACHE}audit-v2-holdout.json`, JSON.stringify(out, null, 1));
}
