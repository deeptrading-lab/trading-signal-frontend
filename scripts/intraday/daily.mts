/**
 * 단타 판단 일일 캘리브레이션 러너 — intraday-decision-overhaul PR-4 검증(관측 전용·읽기 전용).
 *
 *   npx tsx scripts/intraday/daily.mts               # 오늘(KST) 자동
 *   npx tsx scripts/intraday/daily.mts 2026-07-13    # 특정일(당일/최근일만 — KIS 분봉 최근 며칠만 제공)
 *
 * 하는 일: 그날 cli-agent 세션·틱을 Supabase 에서 적재(owner 분포 출력) → 원본 날짜별 저장
 *   → 파이프라인 요약(HOLD%·conviction 분포·CLI 실패종류) → labelTick 로 반사실 채점
 *   → conviction 버킷 승률 + 연속 상관(conviction·signalScore vs +30분 forward return)
 *   → output/report-<date>.txt 저장 + output/daily-log.tsv 에 하루 한 줄 누적.
 *
 * 전제: ① 장중(09:00~15:30) dev 서버가 켜져 있어야 틱이 쌓임(이 스크립트는 읽기만) ② 15:40(자동종료)
 *   이후 실행 ③ 반드시 당일 실행(KIS 과거 분봉은 최근 며칠만 조회 가능).
 *
 * 판정(daily-log.tsv): [>=65WR]이 [grandWR]·25% 아래로 유지 + [convSpear]가 음/0 이면 conviction 역상관
 *   구조적 재확인. 어느 날 >=65WR 33%+ 튀거나 convSpear 뚜렷이 양(특히 상승일)이면 하락장 페이드로 재해석.
 *   상세 해석 기준 = scripts/intraday/BASELINE-2026-07-10.md.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = fileURLToPath(new URL("./output/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

// .env.local 로드(Supabase·KIS 키). 이미 process.env 에 있으면 유지.
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

// ── 1. 적재 ──
const sres = await fetch(`${url}/rest/v1/paper_trading_sessions?select=payload&order=updated_at.desc&limit=120`, { headers: H });
const allDay = (await sres.json()).map((r: any) => r.payload).filter((p: any) => p.decisionProvider === "cli-agent" && kstDate(p.createdAt) === DAY);
// codex 세션 제외 — codex CLI 미설치 환경에선 analyst/judge 전량 실패(매매 0)라 순수 노이즈. claude 만 분석.
const codexExcluded = allDay.filter((p: any) => p.aiProvider === "codex").length;
const sessions = allDay.filter((p: any) => p.aiProvider !== "codex");
const byOwner: Record<string, number> = {};
for (const s of sessions) byOwner[s.owner ?? "(미지정)"] = (byOwner[s.owner ?? "(미지정)"] || 0) + 1;
const ids = sessions.map((s: any) => s.id);
const ticks: any[] = [];
for (let off = 0; ids.length; off += 1000) {
  const tr = await fetch(`${url}/rest/v1/paper_trading_ticks?select=payload&session_id=in.(${ids.join(",")})&order=session_id.asc,tick_index.asc&limit=1000&offset=${off}`, { headers: H });
  const page = (await tr.json()).map((r: any) => r.payload);
  ticks.push(...page);
  if (page.length < 1000) break;
}
fs.writeFileSync(`${OUT}today-sessions-${DAY}.json`, JSON.stringify(sessions));
fs.writeFileSync(`${OUT}today-ticks-${DAY}.json`, JSON.stringify(ticks));

P(`# 단타 일일 리포트 ${DAY}`);
P(`세션 ${sessions.length} (owner ${Object.entries(byOwner).map(([o, n]) => `${o}:${n}`).join(" ") || "없음"}) / 틱 ${ticks.length}${codexExcluded > 0 ? ` · codex ${codexExcluded}세션 제외(CLI 미설치 노이즈)` : ""}`);
if (Object.keys(byOwner).includes("(미지정)")) P(`⚠️ 미지정(owner 없음) 세션 존재 — 이중틱 오염 가능(owner 게이트 #326 확인).`);
if (ticks.length === 0) { P("\n틱 없음 — 종료(장중 서버 미가동 or 미래일)."); fs.writeFileSync(`${OUT}report-${DAY}.txt`, out.join("\n")); process.exit(0); }

// ── 2. 파이프라인 요약 ──
const v2 = ticks.filter((t) => t.decision.judgeSchema === "v2" && t.decision.convictionScore != null);
const holdN = ticks.filter((t) => t.decision.action === "HOLD").length;
const failKinds: Record<string, number> = {};
for (const t of ticks) { const ad = t.decision.agentDiagnostics; if (ad) for (const k of ["analyst", "judge"]) if (ad[k]?.failureKind) failKinds[ad[k].failureKind] = (failKinds[ad[k].failureKind] || 0) + 1; }
const convVals = v2.map((t) => t.decision.convictionScore);
const convMean = convVals.length ? convVals.reduce((a, b) => a + b, 0) / convVals.length : null;
P(`\n파이프라인: HOLD ${(holdN / ticks.length * 100).toFixed(1)}% · v2 conviction ${v2.length}틱(평균 ${convMean?.toFixed(1) ?? "—"}) · CLI 실패 ${Object.keys(failKinds).length ? Object.entries(failKinds).map(([k, v]) => `${k}:${v}`).join(" ") : "없음"}`);

// 레짐 분포 — snapshot.signal.regime(일봉 SMA 기울기 veto). 매 틱 KIS 일봉 페치, 실패 시 0 폴백.
// 여러 날 계속 전부 0 이면 일봉 페치 실패로 regime veto 가 무력화됐다는 신호(진짜 수정 대상).
const regDist: Record<string, number> = { "-1": 0, "0": 0, "1": 0, null: 0 };
for (const t of v2) { const r = t.decision.intradaySnapshot?.signal?.regime; regDist[r == null ? "null" : String(r)] += 1; }
P(`레짐 분포(v2): 강세+1 ${regDist["1"]} · 중립0 ${regDist["0"]} · 약세−1 ${regDist["-1"]}${regDist["1"] + regDist["-1"] === 0 && v2.length > 0 ? "  ⚠️ 전부 중립 — 일봉 레짐 veto 점검(누적 후 판정)" : ""}`);

// ── 3. 라벨링(반사실 채점) + conviction 버킷 승률 ──
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
type R = { conv: number; sig: number | null; label: string; ret: number | null; f30: number | null };
const recs: R[] = [];
for (const s of sessions) {
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
const wr = (rs: R[]) => { const w = rs.filter((r) => r.label === "WIN").length, l = rs.filter((r) => r.label === "LOSS").length; return { w, l, pct: w + l ? (w / (w + l)) * 100 : null }; };
const grand = wr(recs);
const hi = wr(recs.filter((r) => r.conv >= 65));
P(`\nconviction 버킷 승률(W/L, 반사실):`);
for (const [lo, h, nm] of [[0, 40, "<40"], [40, 50, "40-49"], [50, 65, "50-64"], [65, 80, "65-79"], [80, 101, "80+"]] as const) {
  const sub = recs.filter((r) => r.conv >= lo && r.conv < h);
  if (sub.length === 0) continue;
  const b = wr(sub);
  P(`  ${nm.padEnd(6)} 승률 ${b.pct == null ? "—" : b.pct.toFixed(0) + "%"} (${b.w}/${b.l}) · n=${sub.length}`);
}
P(`  → grand ${grand.pct?.toFixed(1) ?? "—"}% (${grand.w}/${grand.l}) · ≥65 ${hi.pct?.toFixed(1) ?? "—"}% (${hi.w}/${hi.l}) · 베이스라인 25%`);

// ── 4. 연속 상관(방향 예측력 — 전체 표본) ──
const pearson = (xs: number[], ys: number[]) => { const n = xs.length; if (n < 3) return null; const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
const rankv = (v: number[]) => { const s = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); s.forEach(([, i], k) => (r[i as number] = k + 1)); return r; };
const spear = (get: (r: R) => number | null) => { const p = recs.map((r) => [get(r), r.f30]).filter(([a, b]) => a != null && b != null) as [number, number][]; return p.length >= 3 ? pearson(rankv(p.map((x) => x[0])), rankv(p.map((x) => x[1]))) : null; };
const convSpear = spear((r) => r.conv), sigSpear = spear((r) => r.sig);
P(`연속상관 vs +30분: conviction Spearman ${convSpear?.toFixed(3) ?? "—"} · signalScore ${sigSpear?.toFixed(3) ?? "—"} (음/0 = 방향 예측력 없음/역)`);

// ── 4b. 급등주 참여율 — 일중 변동폭 큰(기회 있던) 종목을 AI 가 샀나 ──
// '오를건 확신못해 스킵'(추세돌파 못 탐) 가설을 정량 추적: 고변동 종목 중 매수한 비율 + 그 종목 최대 conviction.
const MOVER_PCT = 10; // 일중 basePrice 고저 폭 임계.
let moverN = 0, moverBought = 0; const moverMaxConvs: number[] = [];
for (const s of sessions) {
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

// ── 5. 저장 + 누적 로그 ──
fs.writeFileSync(`${OUT}report-${DAY}.txt`, out.join("\n"));
const logPath = `${OUT}daily-log.tsv`;
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "date\tsessions\tticks\tHOLD%\tv2\tconvMean\tgrandWR\t>=65WR\t>=65(W/L)\tconvSpear\tsigSpear\tregime(-/0/+)\tmovers\tmovBought\tmovMaxConv\tfailKinds\n");
// 같은 날짜 재실행 시 기존 줄 교체(멱등).
const lines = fs.readFileSync(logPath, "utf8").trimEnd().split("\n").filter((ln) => !ln.startsWith(`${DAY}\t`));
const row = [DAY, sessions.length, ticks.length, (holdN / ticks.length * 100).toFixed(1), v2.length, convMean?.toFixed(1) ?? "", grand.pct?.toFixed(1) ?? "", hi.pct?.toFixed(1) ?? "", `${hi.w}/${hi.l}`, convSpear?.toFixed(3) ?? "", sigSpear?.toFixed(3) ?? "", `${regDist["-1"]}/${regDist["0"]}/${regDist["1"]}`, moverN, moverBought, moverMaxConvAvg?.toFixed(0) ?? "", Object.entries(failKinds).map(([k, v]) => `${k}:${v}`).join(",") || "-"].join("\t");
fs.writeFileSync(logPath, [...lines, row].join("\n") + "\n");
P(`\n✅ output/report-${DAY}.txt 저장 · output/daily-log.tsv 누적(${lines.length}일차)`);
