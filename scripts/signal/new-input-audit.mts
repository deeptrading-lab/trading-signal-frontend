/**
 * 새 입력 오프라인 감사(E-2) — 사전 등록 `docs/analysis/new-input-audit-preregistration.md`.
 *
 *   npx tsx scripts/signal/collect-flow.mts     # 먼저 수집(__flow__)
 *   npx tsx scripts/signal/new-input-audit.mts  # 발견 구간 판정 → 통과분만 홀드아웃
 *
 * daily-audit.mts 와 같은 유니버스·유동성 필터·횡단면 demean. 홀드아웃 관측은 발견 판정이 끝난 뒤
 * 통과 (피처 × 방향) 가 있을 때만 만든다(사전 등록 §1 구간).
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const DAILY = fileURLToPath(new URL("./__daily__/", import.meta.url));
const FLOW = fileURLToPath(new URL("./__flow__/", import.meta.url));
const { evaluateSignal } = await import("@/lib/signal/engine");
const { spearman, mean, median, neweyWestT } = await import("@/lib/utils/stats");

// ── 사전 등록 상수 (§1·§4) ───────────────────────────────────────────────────
const H = 10;
const COST_PCT = 0.28;
const MIN_TURNOVER = 3_000_000_000, MIN_CLOSE = 1_000;
const MIN_PER_DATE = 30;
const WARMUP_4AXIS = 130;
const T_CRIT = 2.73; // Bonferroni 8후보 양측
const NW_LAG = H - 1;
const MIN_EVENTS = { discovery: 30, holdout: 10 };
const PERIODS = { discovery: ["2024-01-02", "2025-12-31"], holdout: ["2026-01-01", "2026-08-10"] } as const;
type Period = keyof typeof PERIODS;

type FeatureKey = "F1" | "F2" | "F3" | "F4" | "F5a" | "F5b" | "F5c" | "F5d";
const FEATURES: Array<{ key: FeatureKey; label: string; binary: boolean }> = [
  { key: "F1", label: "외국인 순매수 강도", binary: false },
  { key: "F2", label: "기관 순매수 강도", binary: false },
  { key: "F3", label: "외국인+기관 순매수 강도", binary: false },
  { key: "F4", label: "업종 상대강도", binary: false },
  { key: "F5a", label: "유상증자 공시", binary: true },
  { key: "F5b", label: "자사주취득 공시", binary: true },
  { key: "F5c", label: "자사주처분 공시", binary: true },
  { key: "F5d", label: "전환사채 공시", binary: true },
];

/** 보고서명 → F5 유형(사전 등록 §2). `[` 로 시작하는 정정·부속은 제외. */
function classifyReport(name: string): Array<"F5a" | "F5b" | "F5c" | "F5d"> {
  const n = name.replace(/\s/g, "");
  if (n.startsWith("[")) return [];
  const out: Array<"F5a" | "F5b" | "F5c" | "F5d"> = [];
  if (/유상증자결정|유무상증자결정/.test(n)) out.push("F5a");
  if (/자기주식취득결정|자기주식취득신탁계약체결결정/.test(n)) out.push("F5b");
  if (/자기주식처분결정/.test(n)) out.push("F5c");
  if (/전환사채권발행결정/.test(n)) out.push("F5d");
  return out;
}

// neweyWestT 는 lib/utils/stats.ts 로 이동(스윙 규칙서 감사와 공용, 수식 동일).
function naiveT(xs: number[]): number {
  const n = xs.length, m = mean(xs) ?? 0;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1));
  return m / (sd / Math.sqrt(n));
}

// ── 적재 ─────────────────────────────────────────────────────────────────────
const tickers = fs.readdirSync(DAILY).filter((f) => /^\d{6}\.json$/.test(f)).map((f) => f.slice(0, 6)).sort();
const candles = new Map<string, StockDailyCandle[]>();
for (const t of tickers) candles.set(t, JSON.parse(fs.readFileSync(`${DAILY}${t}.json`, "utf8")));
const sectors: Record<string, string> = JSON.parse(fs.readFileSync(`${FLOW}sectors.json`, "utf8"));
type FlowRow = { d: string; f: number; o: number; tv: number };
const flows = new Map<string, Map<string, FlowRow>>();
let flowFiles = 0, flowEmpty = 0;
for (const t of tickers) {
  const f = `${FLOW}${t}.json`;
  if (!fs.existsSync(f)) continue;
  const rows: FlowRow[] = JSON.parse(fs.readFileSync(f, "utf8"));
  flowFiles++;
  if (rows.length === 0) flowEmpty++;
  flows.set(t, new Map(rows.map((r) => [r.d, r])));
}
type Ev = { date: string; id: string; types: ReturnType<typeof classifyReport> };
const events = new Map<string, Ev[]>();
let dartRows = 0;
for (const f of fs.readdirSync(FLOW).filter((x) => x.startsWith("dart_"))) {
  for (const r of JSON.parse(fs.readFileSync(`${FLOW}${f}`, "utf8")) as Array<{ stock_code: string; report_nm: string; rcept_no: string; rcept_dt: string }>) {
    dartRows++;
    const types = classifyReport(r.report_nm);
    if (!types.length || !/^\d{6}$/.test(r.stock_code ?? "")) continue;
    const date = `${r.rcept_dt.slice(0, 4)}-${r.rcept_dt.slice(4, 6)}-${r.rcept_dt.slice(6, 8)}`;
    if (!events.has(r.stock_code)) events.set(r.stock_code, []);
    events.get(r.stock_code)!.push({ date, id: r.rcept_no, types });
  }
}

// F4 비교군: 날짜 → 업종 → [{ticker, r20}] (유동성 무관 캐시 전 종목).
const r20ByDateSector = new Map<string, Map<string, Array<{ t: string; r: number }>>>();
for (const t of tickers) {
  const sec = sectors[t];
  if (!sec) continue;
  const c = candles.get(t)!;
  for (let i = 20; i < c.length; i++) {
    if (!c[i].close || !c[i - 20].close) continue;
    const d = c[i].date.slice(0, 10);
    if (!r20ByDateSector.has(d)) r20ByDateSector.set(d, new Map());
    const m = r20ByDateSector.get(d)!;
    if (!m.has(sec)) m.set(sec, []);
    m.get(sec)!.push({ t, r: c[i].close / c[i - 20].close - 1 });
  }
}

// ── 관측 ─────────────────────────────────────────────────────────────────────
type Obs = {
  date: string; ticker: string; i: number; ex: number;
  x: Partial<Record<FeatureKey, number>>;
  evIds: Partial<Record<FeatureKey, string[]>>;
};
let flowMissing = 0;
function buildObs(period: Period): Obs[] {
  const [FROM, TO] = PERIODS[period];
  const out: Array<Obs & { fwd: number }> = [];
  for (const t of tickers) {
    const c = candles.get(t)!;
    const fl = flows.get(t);
    const evs = events.get(t) ?? [];
    for (let i = 20; i < c.length - H; i++) {
      const date = c[i].date.slice(0, 10);
      if (date < FROM || date > TO) continue;
      if (c[i].close < MIN_CLOSE) continue;
      let turn = 0;
      for (let k = i - 19; k <= i; k++) turn += c[k].close * (c[k].volume ?? 0);
      if (turn / 20 < MIN_TURNOVER) continue;
      const fwd = ((c[i + H].close - c[i].close) / c[i].close) * 100;
      const x: Obs["x"] = {};
      const evIds: Obs["evIds"] = {};

      // F1~F3 — t−1..t−5 순매수 합 ÷ t−1..t−20 평균 거래대금.
      let ok = !!fl;
      let sf = 0, so = 0, stv = 0;
      for (let k = 1; ok && k <= 20; k++) {
        const r = fl!.get(c[i - k].date.slice(0, 10));
        if (!r || !Number.isFinite(r.f) || !Number.isFinite(r.o) || !Number.isFinite(r.tv)) { ok = false; break; }
        stv += r.tv;
        if (k <= 5) { sf += r.f; so += r.o; }
      }
      if (ok && stv > 0) { const den = stv / 20; x.F1 = sf / den; x.F2 = so / den; x.F3 = (sf + so) / den; }
      else flowMissing++;

      // F4 — 업종(자기 제외 ≥ 3) 중앙값 대비 r20.
      const sec = sectors[t];
      const peers = sec ? r20ByDateSector.get(date)?.get(sec)?.filter((p) => p.t !== t) : undefined;
      if (peers && peers.length >= 3 && c[i - 20].close) x.F4 = c[i].close / c[i - 20].close - 1 - median(peers.map((p) => p.r))!;

      // F5 — 접수일 ∈ (D[t−6], D[t−1]].
      const lo = c[i - 6].date.slice(0, 10), hi = c[i - 1].date.slice(0, 10);
      const inWin = evs.filter((e) => e.date > lo && e.date <= hi);
      for (const k of ["F5a", "F5b", "F5c", "F5d"] as const) {
        const hit = inWin.filter((e) => e.types.includes(k));
        x[k] = hit.length ? 1 : 0;
        if (hit.length) evIds[k] = hit.map((e) => `${t}:${e.id}`);
      }
      out.push({ date, ticker: t, i, ex: 0, fwd, x, evIds });
    }
  }
  // 날짜별 횡단면 demean (유동성 통과 전 관측 기준).
  const byDate = new Map<string, Array<Obs & { fwd: number }>>();
  for (const o of out) { if (!byDate.has(o.date)) byDate.set(o.date, []); byDate.get(o.date)!.push(o); }
  for (const rows of byDate.values()) { const m = mean(rows.map((r) => r.fwd)) ?? 0; for (const r of rows) r.ex = r.fwd - m; }
  return out;
}

// ── 피처 통계 ────────────────────────────────────────────────────────────────
type Stats = {
  nObs: number; nDates: number; events: number;
  meanIC: number; tNW: number; tNaive: number;
  spread: number; posShare: number; negShare: number;
  year: Record<string, number>;
};
function featureStats(obs: Obs[], key: FeatureKey, binary: boolean): Stats {
  const byDate = new Map<string, Obs[]>();
  for (const o of obs) {
    if (o.x[key] === undefined) continue;
    if (!byDate.has(o.date)) byDate.set(o.date, []);
    byDate.get(o.date)!.push(o);
  }
  const ics: number[] = [], spreads: number[] = [];
  const icYear: Record<string, number[]> = {};
  const evSet = new Set<string>();
  let nObs = 0;
  for (const d of [...byDate.keys()].sort()) {
    const rows = byDate.get(d)!;
    if (rows.length < MIN_PER_DATE) continue;
    let spread: number;
    if (binary) {
      const on = rows.filter((r) => r.x[key] === 1), off = rows.filter((r) => r.x[key] === 0);
      if (!on.length || !off.length) continue;
      spread = mean(on.map((r) => r.ex))! - mean(off.map((r) => r.ex))!;
      for (const r of on) for (const id of r.evIds[key] ?? []) evSet.add(id);
    } else {
      const s = [...rows].sort((a, b) => a.x[key]! - b.x[key]!);
      const k = Math.floor(s.length / 10);
      spread = mean(s.slice(-k).map((r) => r.ex))! - mean(s.slice(0, k).map((r) => r.ex))!;
    }
    const ic = spearman(rows.map((r) => r.x[key]!), rows.map((r) => r.ex));
    if (!Number.isFinite(ic)) continue;
    ics.push(ic);
    spreads.push(spread);
    (icYear[d.slice(0, 4)] ??= []).push(ic);
    nObs += rows.length;
  }
  return {
    nObs, nDates: ics.length, events: evSet.size,
    meanIC: mean(ics) ?? Number.NaN, tNW: neweyWestT(ics, NW_LAG), tNaive: naiveT(ics),
    spread: mean(spreads) ?? Number.NaN,
    posShare: spreads.filter((v) => v > 0).length / spreads.length,
    negShare: spreads.filter((v) => v < 0).length / spreads.length,
    year: Object.fromEntries(Object.entries(icYear).map(([y, v]) => [y, mean(v)!])),
  };
}

type Verdict = { dir: 1 | -1; checks: boolean[]; pass: boolean };
/** 발견 판정(사전 등록 §4) — 정(+1)·역(−1) 양방향. */
function judgeDiscovery(s: Stats): Verdict[] {
  return ([1, -1] as const).map((dir) => {
    const checks = [
      Math.sign(s.meanIC) === dir && Math.abs(s.tNW) >= T_CRIT,
      dir * s.spread >= COST_PCT,
      (dir === 1 ? s.posShare : s.negShare) >= 0.6,
      Math.sign(s.year["2024"] ?? 0) === dir && Math.sign(s.year["2025"] ?? 0) === dir,
    ];
    return { dir, checks, pass: checks.every(Boolean) };
  });
}
function judgeHoldout(s: Stats, dir: 1 | -1): Verdict {
  const checks = [Math.sign(s.meanIC) === dir, (dir === 1 ? s.posShare : s.negShare) >= 0.55, dir * s.spread > 0];
  return { dir, checks, pass: checks.every(Boolean) };
}

/** 4축 중복 — 날짜별 Spearman(피처, evaluateSignal score) 평균 (warmup 130봉 이후 관측). */
const scoreCache = new Map<string, number>();
function fourAxisCorr(obs: Obs[], key: FeatureKey): { corr: number; nDates: number } {
  const byDate = new Map<string, Array<{ x: number; s: number }>>();
  for (const o of obs) {
    if (o.x[key] === undefined || o.i < WARMUP_4AXIS) continue;
    const ck = `${o.ticker}:${o.i}`;
    let s = scoreCache.get(ck);
    if (s === undefined) {
      try { s = evaluateSignal(candles.get(o.ticker)!.slice(0, o.i + 1)).score; } catch { continue; }
      scoreCache.set(ck, s);
    }
    if (!byDate.has(o.date)) byDate.set(o.date, []);
    byDate.get(o.date)!.push({ x: o.x[key]!, s });
  }
  const cs: number[] = [];
  for (const rows of byDate.values()) {
    if (rows.length < MIN_PER_DATE) continue;
    const c = spearman(rows.map((r) => r.x), rows.map((r) => r.s));
    if (Number.isFinite(c)) cs.push(c);
  }
  return { corr: mean(cs) ?? Number.NaN, nDates: cs.length };
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
const f = (v: number, d = 4) => (Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(d)}` : "NaN");
const pct = (v: number) => `${Math.round(v * 100)}%`;
const mark = (b: boolean) => (b ? "O" : "x");

const disc = buildObs("discovery");
const discFlowMissing = flowMissing;
console.log("═".repeat(96));
console.log(`새 입력 감사 [발견 ${PERIODS.discovery.join("~")}] · horizon ${H}일 · 비용선 ${COST_PCT}% · t 임계 ${T_CRIT}(NW lag ${NW_LAG})`);
console.log(`관측 ${disc.length.toLocaleString()} · 종목 ${new Set(disc.map((o) => o.ticker)).size} · 거래일 ${new Set(disc.map((o) => o.date)).size}`);
console.log(`수급 파일 ${flowFiles}(빈응답 ${flowEmpty}) · 수급 결측 관측 ${discFlowMissing.toLocaleString()} · 업종 ${Object.values(sectors).filter(Boolean).length}종목 · DART 행 ${dartRows}`);
console.log("═".repeat(96));
console.log(`${"피처".padEnd(22)}${"n관측".padStart(9)}${"일수".padStart(6)}${"이벤트".padStart(7)}${"평균IC".padStart(9)}${"NW t".padStart(8)}${"naive t".padStart(9)}${"스프레드%".padStart(10)}${"+날".padStart(6)}${"−날".padStart(6)}${"IC24".padStart(9)}${"IC25".padStart(9)}  판정(정|역: IC·t/스프레드/안정/연도)`);

const passes: Array<{ key: FeatureKey; dir: 1 | -1 }> = [];
const discStats = new Map<FeatureKey, Stats>();
for (const ft of FEATURES) {
  const s = featureStats(disc, ft.key, ft.binary);
  discStats.set(ft.key, s);
  const insufficient = ft.binary && s.events < MIN_EVENTS.discovery;
  const vs = judgeDiscovery(s);
  const verdict = insufficient
    ? `판정 불가(이벤트 ${s.events} < ${MIN_EVENTS.discovery})`
    : vs.map((v) => `${v.dir > 0 ? "정" : "역"} ${v.checks.map(mark).join("")}${v.pass ? " ★통과" : ""}`).join(" | ");
  if (!insufficient) for (const v of vs) if (v.pass) passes.push({ key: ft.key, dir: v.dir });
  console.log(
    `${`${ft.key} ${ft.label}`.padEnd(22)}${String(s.nObs).padStart(9)}${String(s.nDates).padStart(6)}${(ft.binary ? String(s.events) : "-").padStart(7)}` +
      `${f(s.meanIC).padStart(9)}${f(s.tNW, 2).padStart(8)}${f(s.tNaive, 2).padStart(9)}${f(s.spread, 3).padStart(10)}${pct(s.posShare).padStart(6)}${pct(s.negShare).padStart(6)}` +
      `${f(s.year["2024"] ?? NaN).padStart(9)}${f(s.year["2025"] ?? NaN).padStart(9)}  ${verdict}`,
  );
}

console.log(`\n[4축 중복] 날짜별 Spearman(피처, evaluateSignal score) 평균 — warmup ${WARMUP_4AXIS}봉 이후`);
for (const ft of FEATURES) {
  const { corr, nDates } = fourAxisCorr(disc, ft.key);
  console.log(`  ${`${ft.key} ${ft.label}`.padEnd(22)} ${f(corr, 3)} (${nDates}일)`);
}

console.log(`\n${"─".repeat(96)}`);
if (passes.length === 0) {
  console.log("발견 판정: 통과 (피처 × 방향) 없음 → 홀드아웃 계산 안 함 (사전 등록 §1)");
} else {
  console.log(`발견 통과 ${passes.length}건: ${passes.map((p) => `${p.key}(${p.dir > 0 ? "정" : "역"})`).join(", ")} → 홀드아웃 계산`);
  const hold = buildObs("holdout");
  console.log(`홀드아웃 ${PERIODS.holdout.join("~")} 관측 ${hold.length.toLocaleString()} · 거래일 ${new Set(hold.map((o) => o.date)).size}`);
  for (const p of passes) {
    const ft = FEATURES.find((x) => x.key === p.key)!;
    const s = featureStats(hold, p.key, ft.binary);
    const insufficient = ft.binary && s.events < MIN_EVENTS.holdout;
    const v = judgeHoldout(s, p.dir);
    console.log(
      `  ${`${ft.key} ${ft.label}`.padEnd(22)} n ${s.nObs} · ${s.nDates}일 · 평균IC ${f(s.meanIC)} (NW t ${f(s.tNW, 2)}) · 스프레드 ${f(s.spread, 3)}% · +날 ${pct(s.posShare)} −날 ${pct(s.negShare)}` +
        ` → ${insufficient ? `판정 불가(이벤트 ${s.events})` : `부호/안정/스프레드 ${v.checks.map(mark).join("")} ${v.pass ? "★통과" : "불통과"}`}`,
    );
  }
}
