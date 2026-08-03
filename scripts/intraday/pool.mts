/**
 * 5일 풀링 분석 — 저장된 output/today-ticks-*.json 전부를 provider별로 합쳐 채점.
 * 일별 표본이 작아(≥65 하루 5~23틱) 흔들리므로, 여러 날 풀링해 통계력을 확보한다.
 *   npx tsx scripts/intraday/pool.mts
 * 분봉은 저장 안 돼 재페치(최근 며칠만 가능) — 만료된 날은 UNRESOLVED 로 빠짐.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- 저장된 스냅샷 JSON(스키마 무보증)을
   광범위하게 훑는 일회성 풀링 분석. 상시 도구인 daily.mts·today.mts 는 타입 완비. */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = fileURLToPath(new URL("./output/", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) { const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { labelTick, kstMinuteStamp } = await import("@/lib/server/intraday/tickLabels");
const { deriveIntradayTimeframe } = await import("@/lib/server/paperTrading/constants");
const { fetchTodayMinuteCandles, fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
const { minutesOfDay } = await import("@/lib/api/kis/minuteResample");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const cache = new Map<string, any[]>();
async function candles(day: string, tk: string, tf: number) { const k = `${day}|${tk}|${tf}`; if (!cache.has(k)) { try { cache.set(k, day === today ? await fetchTodayMinuteCandles(tk, tf, 400) : await fetchMinuteCandlesForDate(tk, day.replaceAll("-", ""), tf)); } catch { cache.set(k, []); } } return cache.get(k)!; }
function fwd(cs: any[], st: string, base: number) { const d = st.slice(0, 10), dm = minutesOfDay(st); if (dm < 0) return null; const a = cs.filter((c: any) => c.date.slice(0, 10) === d && c.date > st && minutesOfDay(c.date) >= dm + 30); return a.length ? ((a[0].close - base) / base) * 100 : null; }
const pearson = (xs: number[], ys: number[]) => { const n = xs.length; if (n < 3) return null; const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
const rankv = (v: number[]) => { const s = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); s.forEach(([, i], k) => (r[i as number] = k + 1)); return r; };
const spear = (recs: any[], get: (r: any) => number | null) => { const p = recs.map((r) => [get(r), r.f30]).filter(([a, b]) => a != null && b != null) as [number, number][]; return p.length >= 3 ? pearson(rankv(p.map((x) => x[0])), rankv(p.map((x) => x[1]))) : null; };
const wr = (rs: any[]) => { const w = rs.filter((r) => r.label === "WIN").length, l = rs.filter((r) => r.label === "LOSS").length; return { w, l, pct: w + l ? (w / (w + l)) * 100 : null }; };

// 저장된 날짜 수집
const days = fs.readdirSync(OUT).filter((f) => /^today-ticks-\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(12, 22)).sort();
type Rec = { provider: string; day: string; conv: number; sig: number | null; regime: number | null; label: string; f30: number | null };
const pool: Rec[] = [];
for (const day of days) {
  const sess = JSON.parse(fs.readFileSync(`${OUT}today-sessions-${day}.json`, "utf8"));
  const ticks = JSON.parse(fs.readFileSync(`${OUT}today-ticks-${day}.json`, "utf8"));
  const provOf = (s: any) => (s.aiProvider === "codex" ? "codex" : "claude");
  // provider-day 대량실패(v2<15%) 스킵
  for (const provider of ["claude", "codex"]) {
    const gs = sess.filter((s: any) => provOf(s) === provider);
    if (gs.length === 0) continue;
    const gids = new Set(gs.map((s: any) => s.id));
    const gt = ticks.filter((t: any) => gids.has(t.sessionId));
    const v2 = gt.filter((t: any) => t.decision.judgeSchema === "v2" && t.decision.convictionScore != null);
    if (v2.length < gt.length * 0.15) { console.log(`(스킵) ${day} ${provider}: v2 ${v2.length}/${gt.length} 대량실패`); continue; }
    for (const s of gs) {
      const tk = s.stocks?.[0]?.ticker ?? s.tickers[0]; if (!tk) continue;
      const cs = await candles(day, tk, deriveIntradayTimeframe(s.tickIntervalMinutes));
      for (const t of v2.filter((x: any) => x.sessionId === s.id)) {
        const base = t.decision.intradaySnapshot?.basePrice; if (!base) continue;
        const comp = labelTick(t as any, cs as any);
        pool.push({ provider, day, conv: t.decision.convictionScore, sig: t.decision.intradaySnapshot?.signal?.score ?? null, regime: t.decision.intradaySnapshot?.signal?.regime ?? null, label: comp.label, f30: fwd(cs, kstMinuteStamp(t.tickWindowStart || t.pricedAt || t.createdAt), base) });
      }
    }
  }
}

function report(label: string, rs: Rec[]) {
  const resolved = rs.filter((r) => r.label === "WIN" || r.label === "LOSS");
  console.log(`\n===== ${label} — v2 ${rs.length}틱 · 확정 ${resolved.length} =====`);
  console.log("  버킷      |  n  | WIN LOSS | 승률(W/L) | 평균수익%");
  for (const [lo, h, nm] of [[0, 40, "<40"], [40, 50, "40-49"], [50, 65, "50-64"], [65, 80, "65-79"], [80, 101, "80+"]] as const) {
    const b = rs.filter((r) => r.conv >= lo && r.conv < h); if (b.length === 0) continue;
    const x = wr(b); const rets = b.filter((r) => r.f30 != null).map((r) => r.f30!); const avg = rets.length ? (rets.reduce((a, c) => a + c, 0) / rets.length) : null;
    console.log(`  ${nm.padEnd(7)} | ${String(b.length).padStart(3)} | ${String(x.w).padStart(3)} ${String(x.l).padStart(4)} | ${(x.pct == null ? "—" : x.pct.toFixed(1) + "%").padStart(7)} | ${avg == null ? "—" : (avg >= 0 ? "+" : "") + avg.toFixed(2)}`);
  }
  const g = wr(rs), hi = wr(rs.filter((r) => r.conv >= 65));
  console.log(`  → grand ${g.pct?.toFixed(1) ?? "—"}% (${g.w}/${g.l}) · ≥65 ${hi.pct?.toFixed(1) ?? "—"}% (${hi.w}/${hi.l}) · 손익분기 ~33%`);
  console.log(`  연속상관 vs +30분: conviction Spearman ${spear(rs, (r) => r.conv)?.toFixed(3) ?? "—"} · signalScore ${spear(rs, (r) => r.sig)?.toFixed(3) ?? "—"}`);
}

console.log(`풀링: ${days.length}일 (${days.join(", ")}) · 총 ${pool.length}틱`);
report("전체(claude+codex)", pool);
report("claude(하영)", pool.filter((r) => r.provider === "claude"));
report("codex(찬민)", pool.filter((r) => r.provider === "codex"));
// regime별(veto-on: regime 값 있는 것)
console.log("\n───── regime별(veto 작동 후) — 전체 ─────");
for (const [rv, nm] of [[1, "강세+1"], [0, "중립0"], [-1, "약세−1"]] as const) report(`regime ${nm}`, pool.filter((r) => r.regime === rv));
