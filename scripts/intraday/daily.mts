/**
 * 단타 판단 일일 캘리브레이션 러너 — intraday-decision-overhaul PR-4 검증(관측 전용·읽기 전용).
 *
 *   npx tsx scripts/intraday/daily.mts               # 오늘(KST) 자동
 *   npx tsx scripts/intraday/daily.mts 2026-07-13    # 특정일(당일/최근일만 — KIS 분봉 최근 며칠만 제공)
 *
 * 하는 일: 그날 cli-agent 세션·틱을 Supabase 에서 적재 → **provider(claude/codex)별로 분리** 분석
 *   (모델이 다르면 스킬이 달라 섞으면 안 됨) → 파이프라인 요약·레짐 분포·labelTick 반사실 채점·
 *   conviction 버킷 승률·연속 상관·급등주 참여율 → output/report-<date>.txt + output/daily-log.tsv
 *   (provider별 한 줄씩 누적).
 *
 * 전제: ① 장중(09:00~15:30) dev 서버가 켜져 있어야 틱이 쌓임(이 스크립트는 읽기만) ② 15:40(자동종료)
 *   이후 실행 ③ 반드시 당일(또는 최근 며칠) 실행(KIS 과거 분봉 만료 전).
 *
 * 판정(daily-log.tsv, provider별): [>=65WR]이 [grandWR]·손익분기(RRR2≈33%) 아래 유지 + [convSpear]가
 *   음/0 이면 conviction 무예측력/역상관. ⚠️ v2 가 틱의 15% 미만이면 대량 CLI 실패(노이즈)—무시.
 *   상세 해석 기준 = scripts/intraday/BASELINE-2026-07-10.md.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = fileURLToPath(new URL("./output/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { labelTick, kstMinuteStamp } = await import("@/lib/server/intraday/tickLabels");
const { deriveIntradayTimeframe } = await import("@/lib/server/paperTrading/constants");
const { fetchTodayMinuteCandles, fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
const { minutesOfDay } = await import("@/lib/api/kis/minuteResample");

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: key, Authorization: `Bearer ${key}` };
const kstDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const DAY = process.argv[2] || kstDate(new Date().toISOString());
const isToday = DAY === kstDate(new Date().toISOString());
const out: string[] = [];
const P = (s = "") => { out.push(s); console.log(s); };

// ── 적재(전 provider) ──
const sres = await fetch(`${url}/rest/v1/paper_trading_sessions?select=payload&order=updated_at.desc&limit=200`, { headers: H });
const daySessions = (await sres.json()).map((r: any) => r.payload).filter((p: any) => p.decisionProvider === "cli-agent" && kstDate(p.createdAt) === DAY);
const ids = daySessions.map((s: any) => s.id);
const dayTicks: any[] = [];
for (let off = 0; ids.length; off += 1000) {
  const tr = await fetch(`${url}/rest/v1/paper_trading_ticks?select=payload&session_id=in.(${ids.join(",")})&order=session_id.asc,tick_index.asc&limit=1000&offset=${off}`, { headers: H });
  const page = (await tr.json()).map((r: any) => r.payload);
  dayTicks.push(...page);
  if (page.length < 1000) break;
}
fs.writeFileSync(`${OUT}today-sessions-${DAY}.json`, JSON.stringify(daySessions));
fs.writeFileSync(`${OUT}today-ticks-${DAY}.json`, JSON.stringify(dayTicks));

const providerOf = (s: any): "claude" | "codex" => (s.aiProvider === "codex" ? "codex" : "claude");
P(`# 단타 일일 리포트 ${DAY}`);
P(`전체 세션 ${daySessions.length} / 틱 ${dayTicks.length} — provider별 분리 분석(모델 다르면 섞지 않음)`);
if (dayTicks.length === 0) { P("\n틱 없음 — 종료(장중 서버 미가동 or 미래일)."); fs.writeFileSync(`${OUT}report-${DAY}.txt`, out.join("\n")); process.exit(0); }

// ── 공용 헬퍼 ──
const cache = new Map<string, any[]>();
async function candlesFor(tk: string, tf: number) {
  const k = `${tk}|${tf}`;
  if (!cache.has(k)) {
    try { cache.set(k, isToday ? await fetchTodayMinuteCandles(tk, tf, 400) : await fetchMinuteCandlesForDate(tk, DAY.replaceAll("-", ""), tf)); }
    catch { cache.set(k, []); }
  }
  return cache.get(k)!;
}
function fwd(candles: any[], stamp: string, base: number, Hm: number): number | null {
  const d = stamp.slice(0, 10), dm = minutesOfDay(stamp);
  if (dm < 0) return null;
  const a = candles.filter((c) => c.date.slice(0, 10) === d && c.date > stamp && minutesOfDay(c.date) >= dm + Hm);
  return a.length ? ((a[0].close - base) / base) * 100 : null;
}
const pearson = (xs: number[], ys: number[]) => { const n = xs.length; if (n < 3) return null; const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
const rankv = (v: number[]) => { const s = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); s.forEach(([, i], k) => (r[i as number] = k + 1)); return r; };
type R = { conv: number; sig: number | null; label: string; ret: number | null; f30: number | null };
const wr = (rs: R[]) => { const w = rs.filter((r) => r.label === "WIN").length, l = rs.filter((r) => r.label === "LOSS").length; return { w, l, pct: w + l ? (w / (w + l)) * 100 : null }; };

// ── provider 그룹 1개 분석 ──
async function analyzeGroup(provider: string, sess: any[], ticks: any[]): Promise<string[] | null> {
  if (sess.length === 0) return null;
  const byOwner: Record<string, number> = {};
  for (const s of sess) byOwner[s.owner ?? "(미지정)"] = (byOwner[s.owner ?? "(미지정)"] || 0) + 1;
  const v2 = ticks.filter((t) => t.decision.judgeSchema === "v2" && t.decision.convictionScore != null);
  const holdN = ticks.filter((t) => t.decision.action === "HOLD").length;
  const failKinds: Record<string, number> = {};
  for (const t of ticks) { const ad = t.decision.agentDiagnostics; if (ad) for (const k of ["analyst", "judge"]) if (ad[k]?.failureKind) failKinds[ad[k].failureKind] = (failKinds[ad[k].failureKind] || 0) + 1; }
  const convVals = v2.map((t) => t.decision.convictionScore);
  const convMean = convVals.length ? convVals.reduce((a, b) => a + b, 0) / convVals.length : null;
  const degenerate = v2.length < ticks.length * 0.15; // 대량 CLI 실패(노이즈)

  P(`\n━━━ [${provider}] 세션 ${sess.length} (owner ${Object.entries(byOwner).map(([o, n]) => `${o}:${n}`).join(" ")}) / 틱 ${ticks.length} ━━━`);
  P(`HOLD ${(holdN / ticks.length * 100).toFixed(1)}% · v2 conviction ${v2.length}틱(평균 ${convMean?.toFixed(1) ?? "—"}) · CLI 실패 ${Object.keys(failKinds).length ? Object.entries(failKinds).map(([k, v]) => `${k}:${v}`).join(" ") : "없음"}${degenerate ? "  ⚠️ v2<15% = 대량 CLI 실패(노이즈, 무시)" : ""}`);

  const regDist: Record<string, number> = { "-1": 0, "0": 0, "1": 0, null: 0 };
  for (const t of v2) { const r = t.decision.intradaySnapshot?.signal?.regime; regDist[r == null ? "null" : String(r)] += 1; }
  P(`레짐 분포(v2): 강세+1 ${regDist["1"]} · 중립0 ${regDist["0"]} · 약세−1 ${regDist["-1"]}${regDist["1"] + regDist["-1"] === 0 && v2.length > 0 ? "  ⚠️ 전부 중립" : ""}`);

  const recs: R[] = [];
  for (const s of sess) {
    const tk = s.stocks?.[0]?.ticker ?? s.tickers[0];
    if (!tk) continue;
    const candles = await candlesFor(tk, deriveIntradayTimeframe(s.tickIntervalMinutes));
    for (const t of v2.filter((x) => x.sessionId === s.id)) {
      const base = t.decision.intradaySnapshot?.basePrice;
      if (!base) continue;
      const comp = labelTick(t as any, candles as any);
      const stamp = kstMinuteStamp(t.tickWindowStart || t.pricedAt || t.createdAt);
      recs.push({ conv: t.decision.convictionScore, sig: t.decision.intradaySnapshot?.signal?.score ?? null, label: comp.label, ret: comp.label === "UNRESOLVED" ? null : comp.returnPct, f30: fwd(candles, stamp, base, 30) });
    }
  }
  const grand = wr(recs);
  const hi = wr(recs.filter((r) => r.conv >= 65));
  P(`conviction 버킷 승률(W/L, 반사실):`);
  for (const [lo, h, nm] of [[0, 40, "<40"], [40, 50, "40-49"], [50, 65, "50-64"], [65, 80, "65-79"], [80, 101, "80+"]] as const) {
    const sub = recs.filter((r) => r.conv >= lo && r.conv < h);
    if (sub.length === 0) continue;
    const b = wr(sub);
    P(`  ${nm.padEnd(6)} 승률 ${b.pct == null ? "—" : b.pct.toFixed(0) + "%"} (${b.w}/${b.l}) · n=${sub.length}`);
  }
  P(`  → grand ${grand.pct?.toFixed(1) ?? "—"}% (${grand.w}/${grand.l}) · ≥65 ${hi.pct?.toFixed(1) ?? "—"}% (${hi.w}/${hi.l}) · 손익분기 ~33%`);

  const spear = (get: (r: R) => number | null) => { const p = recs.map((r) => [get(r), r.f30]).filter(([a, b]) => a != null && b != null) as [number, number][]; return p.length >= 3 ? pearson(rankv(p.map((x) => x[0])), rankv(p.map((x) => x[1]))) : null; };
  const convSpear = spear((r) => r.conv), sigSpear = spear((r) => r.sig);
  P(`연속상관 vs +30분: conviction Spearman ${convSpear?.toFixed(3) ?? "—"} · signalScore ${sigSpear?.toFixed(3) ?? "—"} (음/0 = 방향 예측력 없음/역)`);

  const MOVER_PCT = 10;
  let moverN = 0, moverBought = 0; const moverMaxConvs: number[] = [];
  for (const s of sess) {
    const st = ticks.filter((t) => t.sessionId === s.id);
    const bases = st.map((t) => t.decision.intradaySnapshot?.basePrice).filter((b) => b) as number[];
    if (bases.length < 2) continue;
    const range = ((Math.max(...bases) - Math.min(...bases)) / Math.min(...bases)) * 100;
    if (range < MOVER_PCT) continue;
    moverN += 1;
    if (st.some((t) => t.decision.action === "BUY")) moverBought += 1;
    const convs = st.map((t) => t.decision.convictionScore).filter((c) => c != null) as number[];
    if (convs.length) moverMaxConvs.push(Math.max(...convs));
  }
  const moverMaxConvAvg = moverMaxConvs.length ? moverMaxConvs.reduce((a, b) => a + b, 0) / moverMaxConvs.length : null;
  P(`급등주 참여(일중폭≥${MOVER_PCT}%): ${moverN}종목 중 매수 ${moverBought} · 그 종목 conviction 최대 평균 ${moverMaxConvAvg?.toFixed(0) ?? "—"}(BUY컷 65)`);

  // 로그 행(provider 컬럼 포함)
  return [DAY, provider, sess.length, ticks.length, (holdN / ticks.length * 100).toFixed(1), v2.length, convMean?.toFixed(1) ?? "", grand.pct?.toFixed(1) ?? "", hi.pct?.toFixed(1) ?? "", `${hi.w}/${hi.l}`, convSpear?.toFixed(3) ?? "", sigSpear?.toFixed(3) ?? "", `${regDist["-1"]}/${regDist["0"]}/${regDist["1"]}`, moverN, moverBought, moverMaxConvAvg?.toFixed(0) ?? "", (Object.entries(failKinds).map(([k, v]) => `${k}:${v}`).join(",") || "-") + (degenerate ? "(대량실패)" : "")].map(String);
}

// ── provider별 분석 + 로그 ──
const rows: string[][] = [];
for (const provider of ["claude", "codex"]) {
  const gs = daySessions.filter((s: any) => providerOf(s) === provider);
  const gids = new Set(gs.map((s: any) => s.id));
  const gt = dayTicks.filter((t) => gids.has(t.sessionId));
  const row = await analyzeGroup(provider, gs, gt);
  if (row) rows.push(row);
}

fs.writeFileSync(`${OUT}report-${DAY}.txt`, out.join("\n"));
const logPath = `${OUT}daily-log.tsv`;
const HEADER = "date\tprovider\tsessions\tticks\tHOLD%\tv2\tconvMean\tgrandWR\t>=65WR\t>=65(W/L)\tconvSpear\tsigSpear\tregime(-/0/+)\tmovers\tmovBought\tmovMaxConv\tfailKinds\n";
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, HEADER);
// 같은 날짜의 모든 provider 행 교체(멱등).
const kept = fs.readFileSync(logPath, "utf8").trimEnd().split("\n").filter((ln) => !ln.startsWith(`${DAY}\t`));
fs.writeFileSync(logPath, [...kept, ...rows.map((r) => r.join("\t"))].join("\n") + "\n");
const days = new Set(fs.readFileSync(logPath, "utf8").trim().split("\n").slice(1).map((l) => l.split("\t")[0]));
P(`\n✅ output/report-${DAY}.txt 저장 · daily-log.tsv (provider ${rows.length}행 · 총 ${days.size}일)`);
