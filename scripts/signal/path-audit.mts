/**
 * Phase 1b 검증2 — 경로 의존(H3) 시뮬레이션.
 *   npx tsx scripts/signal/path-audit.mts            # 인샘플(7~8월)
 *   npx tsx scripts/signal/path-audit.mts oos        # 아웃오브샘플(6월)
 *
 * 질문: 하위 십분위 진입의 **60분 평균 초과수익 +0.4%가 실제로 실현되는가.**
 * Phase 1a 는 종가 대 종가만 봤다 — 손절이 먼저 맞으면 그 평균은 실현되지 않는다.
 *
 * 방법(사전 등록 `signal-edge-phase1b-preregistration.md` 검증2 그대로):
 * - 라이브와 동일 배리어: 구조 배리어 우선, 미확보 시 ATR 폴백(TP 3×ATR / SL 1.5×ATR = 손익비 2.0)
 * - 최대 보유 60분(12봉), 미도달 시 시간 청산
 * - 왕복 비용 0.28% 차감
 * - 대조군: 같은 날·같은 시간대 무작위 진입(= 신호 없이 사면?) 및 상위 십분위(정방향)
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const MODE = process.argv[2] === "oos" ? "oos" : "is";
const DIR = fileURLToPath(new URL(MODE === "oos" ? "./__fixtures__oos__/" : "./__fixtures__/", import.meta.url));

const { resampleMinuteCandles } = await import("@/lib/api/kis/minuteChartChunked");
const { evaluateIntradaySignal, resolveIntradayProfile } = await import("@/lib/signal/intradayProfile");
const { structureBarrierAt } = await import("@/lib/signal/levels/structureBarrier");
const { atrAt, ATR_FALLBACK_TP_MULT, ATR_FALLBACK_SL_MULT } = await import("@/lib/signal/levels/atr");

const TF = 5;
const HOLD_BARS = 12; // 60분
const COST_PCT = 0.28;
const MIN_RRR = 1.5;
const PROFILE = resolveIntradayProfile(TF);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith("_1m.json"));
const byTicker = new Map<string, string[]>();
for (const f of files) {
  const [ticker, ymd] = f.replace("_1m.json", "").split("_");
  if (!byTicker.has(ticker)) byTicker.set(ticker, []);
  byTicker.get(ticker)!.push(ymd);
}
for (const v of byTicker.values()) v.sort();
const load = (t: string, d: string): StockMinuteCandle[] => {
  const p = `${DIR}${t}_${d}_1m.json`;
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
};
/** OOS 는 universe.json 이 정한 (종목,일)만 대상 — 사전 등록된 하드필터 결과. */
const oosSet = MODE === "oos" && fs.existsSync(`${DIR}universe.json`)
  ? new Set((JSON.parse(fs.readFileSync(`${DIR}universe.json`, "utf8")) as Array<{ ticker: string; day: string }>).map((p) => `${p.ticker}|${p.day}`))
  : null;

// ── 관측: 각 봉의 signalScore + 그 시점 진입의 배리어 실현 결과 ──────────────
type Row = { day: string; score: number; realized: number; label: string; mfe: number; mae: number };
const rows: Row[] = [];

for (const [ticker, days] of byTicker) {
  for (let di = 0; di < days.length; di++) {
    const target = days[di];
    if (oosSet && !oosSet.has(`${ticker}|${target}`)) continue;
    const prior1m = days.slice(Math.max(0, di - 3), di).flatMap((d) => load(ticker, d));
    const today1m = load(ticker, target);
    if (today1m.length < 100) continue;
    const all5 = resampleMinuteCandles([...prior1m, ...today1m], TF);
    const start = resampleMinuteCandles(prior1m, TF).length;
    if (all5.length - start < 20) continue;

    for (let i = start; i < all5.length - HOLD_BARS; i++) {
      if (i + 1 < PROFILE.minBars) continue;
      let sig;
      try { sig = evaluateIntradaySignal(all5.slice(0, i + 1), TF, 0); } catch { continue; }
      const entry = all5[i].close;
      if (!entry) continue;

      // 라이브와 동일한 배리어 결정(구조 우선 → ATR 폴백).
      const hist = all5.slice(0, i + 1);
      const st = structureBarrierAt(hist, entry, 1, {
        lookbackBars: PROFILE.structureLookback, maStopPeriod: 20, minRRR: MIN_RRR,
      });
      let tp = st?.tpPrice ?? null, sl = st?.slPrice ?? null;
      if (!st) {
        const a = atrAt(hist, hist.length - 1);
        if (a == null || a <= 0) continue;
        tp = entry + a * ATR_FALLBACK_TP_MULT;
        sl = entry - a * ATR_FALLBACK_SL_MULT;
      }
      if (tp == null || sl == null || sl >= entry || tp <= entry) continue;

      // 경로 순회 — 같은 봉에 둘 다 닿으면 손절 우선(보수적, labelTick 규약과 동일).
      let realized: number | null = null, label = "TIME";
      let mfe = 0, mae = 0;
      for (let k = i + 1; k <= i + HOLD_BARS && k < all5.length; k++) {
        const c = all5[k];
        mfe = Math.max(mfe, ((c.high - entry) / entry) * 100);
        mae = Math.min(mae, ((c.low - entry) / entry) * 100);
        if (c.low <= sl) { realized = ((sl - entry) / entry) * 100; label = "SL"; break; }
        if (c.high >= tp) { realized = ((tp - entry) / entry) * 100; label = "TP"; break; }
      }
      if (realized == null) {
        const exit = all5[Math.min(i + HOLD_BARS, all5.length - 1)].close;
        realized = ((exit - entry) / entry) * 100;
      }
      rows.push({ day: target, score: sig.score, realized: realized - COST_PCT, label, mfe, mae });
    }
  }
}

// ── 리포트 ───────────────────────────────────────────────────────────────────
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const days = [...new Set(rows.map((r) => r.day))].sort();
console.log("═".repeat(74));
console.log(`Phase 1b 검증2 — 경로 의존 (${MODE === "oos" ? "아웃오브샘플 2026-06" : "인샘플 2026-07~08"})`);
console.log(`진입 후보 ${rows.length.toLocaleString()}건 · ${days.length}거래일 · 배리어 TP 3×ATR/SL 1.5×ATR · 보유 ≤60분 · 비용 ${COST_PCT}% 차감`);
console.log("═".repeat(74));

function report(name: string, sel: Row[]) {
  if (!sel.length) { console.log(`\n[${name}] 표본 없음`); return; }
  const tp = sel.filter((r) => r.label === "TP").length;
  const sl = sel.filter((r) => r.label === "SL").length;
  const tm = sel.filter((r) => r.label === "TIME").length;
  const wins = sel.filter((r) => r.realized > 0).length;
  const net = mean(sel.map((r) => r.realized));
  // 일자별 순수익 양(+) 비율
  let pos = 0, tot = 0;
  for (const d of days) {
    const dr = sel.filter((r) => r.day === d);
    if (dr.length < 10) continue;
    tot++; if (mean(dr.map((r) => r.realized)) > 0) pos++;
  }
  console.log(`\n[${name}] n=${sel.length}`);
  console.log(`  청산: TP ${tp}(${((tp / sel.length) * 100).toFixed(0)}%) · SL ${sl}(${((sl / sel.length) * 100).toFixed(0)}%) · 시간 ${tm}(${((tm / sel.length) * 100).toFixed(0)}%)`);
  console.log(`  승률 ${((wins / sel.length) * 100).toFixed(1)}% (손익분기 33%) · MFE 평균 +${mean(sel.map((r) => r.mfe)).toFixed(2)}% · MAE 평균 ${mean(sel.map((r) => r.mae)).toFixed(2)}%`);
  console.log(`  ★비용 차감 후 거래당 순수익 ${net >= 0 ? "+" : ""}${net.toFixed(3)}%  ${net > 0 ? "✅" : "❌"} · 일자별 양(+) ${tot ? Math.round((pos / tot) * 100) : 0}%`);
}

const sorted = [...rows].sort((a, b) => a.score - b.score);
const k = Math.max(1, Math.floor(rows.length / 10));
report("하위 십분위 (역방향 가설 H-INV)", sorted.slice(0, k));
report("상위 십분위 (정방향 = 현재 라이브가 사는 구간)", sorted.slice(-k));
report("전체 (무선별 진입 대조군)", rows);

const inv = mean(sorted.slice(0, k).map((r) => r.realized));
console.log(`\n${"─".repeat(74)}`);
console.log(`사전 등록 기준 4·5 판정: 거래당 순수익 ${inv > 0 ? "> 0 ✅ 통과" : "≤ 0 ❌ 미달"}`);
