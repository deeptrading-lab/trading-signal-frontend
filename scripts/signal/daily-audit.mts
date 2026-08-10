/**
 * 일봉 재감사 — 4축 신호의 예측력·비용 대비 크기 (사전 등록 `signal-daily-audit-preregistration.md`).
 *
 *   npx tsx scripts/signal/daily-audit.mts            # 발견 구간(2024-01~2025-12)
 *   npx tsx scripts/signal/daily-audit.mts holdout    # 홀드아웃(2026-01~08)
 *
 * 분봉 감사와 **같은 방법, 다른 타임프레임**:
 * - 평가는 라이브와 동일한 `evaluateSignal`(일봉 진입점, warmup 130)
 * - 초과수익 = 각 **날짜의 전 종목 횡단면 평균**을 뺀 값(시장 등락 제거 — Simpson's paradox 회피)
 * - 정방향(H-FWD, 상위 십분위)·역방향(H-REV, 하위 십분위) **대칭 등록**이라 둘 다 보고한다
 * - point-in-time 유동성 필터(직전 20일 평균 거래대금·종가) — 룩어헤드 없음
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DIR = fileURLToPath(new URL("./__daily__/", import.meta.url));
const { evaluateSignal } = await import("@/lib/signal/engine");

const MODE = process.argv[2] === "holdout" ? "holdout" : "discovery";
const [FROM, TO] = MODE === "holdout" ? ["2026-01-01", "2026-08-10"] : ["2024-01-02", "2025-12-31"];
const HORIZONS = [3, 5, 10, 20]; // 거래일
const COST_PCT = 0.28;
const WARMUP = 130; // evaluateSignal 일봉 기본
const MIN_TURNOVER = 3_000_000_000; // 직전 20일 평균 거래대금 30억
const MIN_CLOSE = 1_000;

// ── 적재 ─────────────────────────────────────────────────────────────────────
const files = fs.readdirSync(DIR).filter((f) => /^\d{6}\.json$/.test(f));
type Obs = { date: string; ticker: string; score: number; fwd: Record<number, number>; ex: Record<number, number> };
const obs: Obs[] = [];
let usedTickers = 0;

for (const f of files) {
  const candles: StockDailyCandle[] = JSON.parse(fs.readFileSync(`${DIR}${f}`, "utf8"));
  if (candles.length < WARMUP + Math.max(...HORIZONS) + 5) continue;
  const ticker = f.replace(".json", "");
  let used = false;
  for (let i = WARMUP; i < candles.length - Math.max(...HORIZONS); i++) {
    const c = candles[i];
    const date = c.date.slice(0, 10);
    if (date < FROM || date > TO) continue;
    // point-in-time 유동성 필터 — i 시점까지의 정보만 사용.
    if (c.close < MIN_CLOSE) continue;
    const win = candles.slice(i - 19, i + 1);
    const turnover = win.reduce((a, b) => a + b.close * (b.volume ?? 0), 0) / win.length;
    if (turnover < MIN_TURNOVER) continue;

    let sig;
    try { sig = evaluateSignal(candles.slice(0, i + 1)); } catch { continue; }
    const base = c.close;
    if (!base) continue;
    const fwd: Record<number, number> = {};
    for (const h of HORIZONS) fwd[h] = ((candles[i + h].close - base) / base) * 100;
    obs.push({ date, ticker, score: sig.score, fwd, ex: {} });
    used = true;
  }
  if (used) usedTickers++;
}

// ── 날짜별 횡단면 demean ─────────────────────────────────────────────────────
const dates = [...new Set(obs.map((o) => o.date))].sort();
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const byDate = new Map<string, Obs[]>();
for (const o of obs) { if (!byDate.has(o.date)) byDate.set(o.date, []); byDate.get(o.date)!.push(o); }
for (const [, rows] of byDate) {
  for (const h of HORIZONS) {
    const m = mean(rows.map((r) => r.fwd[h]));
    for (const r of rows) r.ex[h] = r.fwd[h] - m;
  }
}

// ── 통계 ─────────────────────────────────────────────────────────────────────
const rank = (v: number[]): number[] => {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(v.length);
  idx.forEach(([, i], k) => (r[i] = k + 1));
  return r;
};
function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 20) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}
const spearman = (xs: number[], ys: number[]) => pearson(rank(xs), rank(ys));

console.log("═".repeat(76));
console.log(`일봉 재감사 [${MODE === "holdout" ? "★홀드아웃 2026-01~08" : "발견구간 2024-01~2025-12"}]`);
console.log(`관측 ${obs.length.toLocaleString()}건 · 종목 ${usedTickers} · 거래일 ${dates.length} · warmup ${WARMUP}봉 · 유동성 ≥30억`);
console.log(`평가=evaluateSignal(라이브 일봉 경로) · 초과수익=날짜별 횡단면 demean · 비용선 ${COST_PCT}%`);
console.log("═".repeat(76));

// [A] 횡단면 IC
console.log(`\n[A] 횡단면 IC (날짜별 Spearman) — 평균 / 양(+)인 날 비율`);
console.log(`${"".padEnd(10)}${HORIZONS.map((h) => `${h}일`.padStart(18)).join("")}`);
const icByH: Record<number, number[]> = {};
{
  const cells = HORIZONS.map((h) => {
    const ics: number[] = [];
    for (const [, rows] of byDate) {
      if (rows.length < 30) continue;
      const ic = spearman(rows.map((r) => r.score), rows.map((r) => r.fwd[h]));
      if (ic != null) ics.push(ic);
    }
    icByH[h] = ics;
    const m = mean(ics);
    const pos = ics.length ? Math.round((ics.filter((v) => v > 0).length / ics.length) * 100) : 0;
    return `${m >= 0 ? "+" : ""}${m.toFixed(4)} (${pos}%)`.padStart(18);
  });
  console.log(`${"signalScore".padEnd(10)}${cells.join("")}`);
}

// [B] 십분위 초과수익 — 정방향(상위)·역방향(하위) 대칭 보고
function decile(h: number, side: "top" | "bot") {
  const rows = obs.map((o) => ({ x: o.score, y: o.ex[h], d: o.date }));
  rows.sort((a, b) => (side === "top" ? b.x - a.x : a.x - b.x));
  const k = Math.max(1, Math.floor(rows.length / 10));
  const val = mean(rows.slice(0, k).map((r) => r.y));
  // 날짜별: 그날 해당 십분위 초과수익이 양(+)인 비율
  let pos = 0, tot = 0;
  for (const [, drows] of byDate) {
    if (drows.length < 30) continue;
    const dr = drows.map((o) => ({ x: o.score, y: o.ex[h] })).sort((a, b) => (side === "top" ? b.x - a.x : a.x - b.x));
    const dk = Math.max(1, Math.floor(dr.length / 10));
    tot++; if (mean(dr.slice(0, dk).map((r) => r.y)) > 0) pos++;
  }
  return { val, posPct: tot ? (pos / tot) * 100 : 0 };
}
console.log(`\n[B] 십분위 초과수익 (%) — 기준: >${COST_PCT}% AND 양(+)인 날 ≥60%`);
console.log(`${"".padEnd(18)}${HORIZONS.map((h) => `${h}일`.padStart(20)).join("")}`);
const pass: string[] = [];
for (const [side, label, icSign] of [["top", "H-FWD 상위십분위", 1], ["bot", "H-REV 하위십분위", -1]] as const) {
  const cells = HORIZONS.map((h) => {
    const { val, posPct } = decile(h, side);
    const ics = icByH[h] ?? [];
    const icOk = ics.length > 0 && (ics.filter((v) => (icSign > 0 ? v > 0 : v < 0)).length / ics.length) >= 0.6;
    const ok = val > COST_PCT && posPct >= 60 && icOk;
    if (ok) pass.push(`${label} × ${h}일 (초과 ${val.toFixed(3)}%, 날 ${posPct.toFixed(0)}%, IC부호일치 O)`);
    return `${val >= 0 ? "+" : ""}${val.toFixed(3)} (${posPct.toFixed(0)}%)${ok ? " ★" : val > COST_PCT ? " △" : ""}`.padStart(20);
  });
  console.log(`${label.padEnd(18)}${cells.join("")}`);
}
console.log(`  ※ ★=기준 1·2·3 전부 충족 / △=크기는 넘지만 안정성·IC부호 미달`);

// [C] 십분위 전체 프로파일 — 진단용(판정 기준 아님). 관계가 단조인지 U자인지 본다.
console.log(`\n[C] 십분위별 초과수익 프로파일 (%, 진단용) — D1=최저 점수 … D10=최고 점수`);
for (const h of HORIZONS) {
  const rows = obs.map((o) => ({ x: o.score, y: o.ex[h] })).sort((a, b) => a.x - b.x);
  const k = Math.floor(rows.length / 10);
  const cells: string[] = [];
  for (let d = 0; d < 10; d++) {
    const slice = rows.slice(d * k, d === 9 ? rows.length : (d + 1) * k);
    cells.push(`${mean(slice.map((r) => r.y)) >= 0 ? "+" : ""}${mean(slice.map((r) => r.y)).toFixed(2)}`.padStart(7));
  }
  console.log(`  ${String(h).padStart(2)}일: ${cells.join("")}`);
}

console.log(`\n${"─".repeat(76)}`);
if (pass.length === 0) console.log(`판정: ❌ 통과 조합 없음 — 이 구간에서 4축은 비용선을 넘지 못함`);
else { console.log(`판정: 통과 조합 ${pass.length}건`); for (const p of pass) console.log(`   · ${p}`); }
