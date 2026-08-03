/**
 * 오늘(또는 지정일) 단타 세션 실황 점검 — 한 줄로 하루 상태를 본다.
 *
 *   npx tsx scripts/intraday/today.mts              # 오늘(KST)
 *   npx tsx scripts/intraday/today.mts 2026-07-29   # 특정일
 *
 * 보는 것: 오토파일럿 런/로테이션 · AI 호출 vs 게이트 스킵 · conviction 분포(픽스 전 기준선 대비)
 *   · BUY 판단 근거 · 실현 손익 · 에러. 장중 수시 확인과 장마감 요약에 공용.
 *
 * ⚠️ 채점(WIN/LOSS)·다일 풀링은 daily.mts / pool.mts 담당 — 이 스크립트는 "지금 정상인가" 전용.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { AutopilotRun, AutopilotRotationEvent } from "@/lib/types/paperTrading/autopilot";
import type {
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

/** Supabase REST 행 — 도메인 객체는 payload(jsonb)에 통째로 들어있다. */
type RunRow = { id: string; status: string; owner: string; payload: AutopilotRun; updated_at: string };
type TickRow = { session_id: string; created_at: string; payload: PaperTradingTick };
type SessionRow = { id: string; status: string; payload: PaperTradingSession };

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const h = { apikey: key, Authorization: `Bearer ${key}` };
const day =
  process.argv[2] ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

const get = <T>(path: string): Promise<T[]> =>
  fetch(`${url}/rest/v1/${path}`, { headers: h }).then((r) => r.json() as Promise<T[]>);
const kst = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Seoul", hour12: false });

// ─── 오토파일럿 런 ────────────────────────────────────────────────────────────
const runs = await get<RunRow>(
  `paper_trading_autopilot_runs?select=id,status,owner,payload,updated_at&order=updated_at.desc&limit=10`,
);
console.log(`===== ${day} 단타 실황 =====\n[오토파일럿 런]`);
for (const r of runs) {
  const p = r.payload ?? {};
  if (!(p.startedAt ?? "").startsWith(day)) continue;
  const log = p.rotationLog ?? [];
  const fills = log.filter((e: AutopilotRotationEvent) => e.kind === "fill").length;
  const reps = log.filter((e: AutopilotRotationEvent) => e.kind === "replace").length;
  console.log(
    `  ${r.id.slice(0, 8)} ${r.status.padEnd(9)} owner=${r.owner} 슬롯=[${(p.slots ?? []).map((s: { ticker: string | null }) => s.ticker || "빈").join(" ")}] fill ${fills}·replace ${reps}`,
  );
  const skips: Record<string, number> = {};
  for (const e of log) if (e.kind === "skip") skips[e.note ?? "?"] = (skips[e.note ?? "?"] ?? 0) + 1;
  for (const [k, v] of Object.entries(skips).sort((a, b) => b[1] - a[1]).slice(0, 3))
    console.log(`      skip ${v}회 — ${k}`);
}

// ─── 틱 ───────────────────────────────────────────────────────────────────────
const ticks = await get<TickRow>(
  `paper_trading_ticks?created_at=gte.${day}T00:00:00&created_at=lt.${day}T23:59:59&select=session_id,created_at,payload&order=created_at.asc&limit=3000`,
);
const llm = ticks.filter((x: TickRow) => x.payload?.decision?.judgeSchema === "v2");
const skipped = ticks.filter((x: TickRow) =>
  (x.payload?.decision?.gateAdjustments ?? []).some((g: string) => g.includes("상황 변화 없음")),
);
const risk = ticks.filter((x: TickRow) => x.payload?.triggeredBy === "risk");
const errs = ticks.filter(
  (x: TickRow) =>
    x.payload?.errorMessage ||
    x.payload?.decision?.agentDiagnostics?.judge?.failKind ||
    x.payload?.decision?.agentDiagnostics?.analyst?.failKind,
);
const orders = ticks.flatMap((x: TickRow) =>
  (x.payload?.orders ?? []).map((o: { side: string; price: number | null; quantity: number | null }) => ({ at: x.created_at, ...o })),
);
console.log(`\n[틱] 총 ${ticks.length} · AI호출(v2) ${llm.length} · 변화없음 스킵 ${skipped.length} · risk ${risk.length} · 주문 ${orders.length}건`);
console.log(`[에러] ${errs.length}건${errs.length ? " ⚠️" : " ✅"}`);
for (const e of errs.slice(0, 3))
  console.log(`   ${kst(e.created_at)} ${e.payload.errorMessage ?? JSON.stringify(e.payload.decision?.agentDiagnostics).slice(0, 120)}`);

// ─── conviction 분포 (2026-07-28 밴드 재배치 이후 관찰 지표) ──────────────────
const convs = llm
  .map((x: TickRow) => x.payload.decision.convictionScore)
  .filter((c): c is number => typeof c === "number");
if (convs.length) {
  const mean = convs.reduce((a: number, b: number) => a + b, 0) / convs.length;
  console.log(`\n[conviction] n=${convs.length} 평균 ${mean.toFixed(1)} · 최대 ${Math.max(...convs)} · 최소 ${Math.min(...convs)}`);
  // 기준선 = 픽스 전(7/21~23, 프롬프트가 65를 못 박아 62-64 에 인공 밀집하던 분포).
  const BASE: Record<string, string> = {
    "<40": "12%", "40-49": "19%", "50-54": "7%", "55-57": "11%",
    "58-61": "22%", "62-64": "25%", "65-74": "4%", "75-89": "0%", "90+": "0%",
  };
  const BANDS: Array<[number, number, string]> = [
    [0, 40, "<40"], [40, 50, "40-49"], [50, 55, "50-54"], [55, 58, "55-57"],
    [58, 62, "58-61"], [62, 65, "62-64"], [65, 75, "65-74"], [75, 90, "75-89"], [90, 101, "90+"],
  ];
  console.log("  구간       n         분포            픽스전");
  for (const [lo, hi, nm] of BANDS) {
    const n = convs.filter((c: number) => c >= lo && c < hi).length;
    const pct = (n / convs.length) * 100;
    console.log(`  ${nm.padEnd(7)} ${String(n).padStart(3)} (${pct.toFixed(0).padStart(3)}%) ${"█".repeat(Math.round(pct / 4)).padEnd(13)} ${BASE[nm] ?? "-"}`);
  }
  const pass = convs.filter((c: number) => c >= 58).length;
  console.log(`  → 컷 58 통과 ${pass}/${convs.length} (${((pass / convs.length) * 100).toFixed(0)}%)`);
  const acts: Record<string, number> = {};
  for (const x of llm) acts[x.payload.decision.action] = (acts[x.payload.decision.action] ?? 0) + 1;
  console.log(`  → AI 액션: ${Object.entries(acts).map(([k, v]) => `${k} ${v}`).join(" / ")}`);
}

// ─── BUY 판단 근거 ────────────────────────────────────────────────────────────
const buys = ticks.filter((x: TickRow) => x.payload?.decision?.action === "BUY");
if (buys.length) {
  console.log(`\n[BUY 판단 ${buys.length}건]`);
  for (const x of buys) {
    const d = x.payload.decision;
    console.log(`  ${kst(x.created_at)} conv=${d.convictionScore ?? "-"} 주문=${(x.payload.orders ?? []).length}`);
    console.log(`     "${String(d.rationale ?? "").slice(0, 130)}"`);
  }
}

// ─── 실현 손익 ────────────────────────────────────────────────────────────────
const sessions = await get<SessionRow>(
  `paper_trading_sessions?select=id,status,payload&order=updated_at.desc&limit=200`,
);
const mine = sessions.filter((x: TickRow) => (x.payload?.startedAt ?? "").startsWith(day));
const byOwner = new Map<string, { n: number; traded: number; pnl: number; cap: number }>();
for (const x of mine) {
  const p = x.payload;
  const owner = p.owner ?? "?";
  if (!byOwner.has(owner)) byOwner.set(owner, { n: 0, traded: 0, pnl: 0, cap: p.initialCash ?? 0 });
  const acc = byOwner.get(owner)!;
  acc.n += 1;
  const pnl = (p.portfolioValue ?? p.initialCash ?? 0) - (p.initialCash ?? 0);
  if (Math.abs(pnl) > 1) {
    acc.traded += 1;
    acc.pnl += pnl;
  }
}
console.log("\n[실현 손익] (오토파일럿 세션 = 슬롯 로테이션 단위)");
for (const [owner, a] of byOwner)
  console.log(
    `  ${owner}: 세션 ${a.n}개 중 매매 ${a.traded}개 · 손익 ${Math.round(a.pnl).toLocaleString()}원` +
      (a.cap ? ` (런 총자본 대비 ${((a.pnl / (a.cap * 3)) * 100).toFixed(3)}%)` : ""),
  );
// ─── 비용 분해 — "손실이 판단 탓인가 비용 탓인가" ─────────────────────────────
// 왕복 ~0.28%(수수료 0.015%/편도 + 매도 제세금 0.15% + 슬리피지 0.05%/편도)가 net 부호를 가르므로
// 실현손익을 [순수 가격손익] + [거래비용]으로 쪼개 본다. 비용 비중이 크면 개선 레버는
// 판단 품질이 아니라 "거래당 기대 이동폭 vs 비용"(회전율·목표폭) 쪽이다.
const BUY_RATE = 0.0007; // 수수료 0.015% + 슬리피지 0.05%
const SELL_RATE = 0.0021; // 위 + 제세금 0.15%
type Agg = { name: string; owner: string; buys: number; sells: number; turnover: number; pnl: number; cost: number };
const bySess = new Map<string, Agg>();
const metaOf = new Map<string, PaperTradingSession>();
for (const x of mine) metaOf.set(x.id, x.payload);
for (const x of ticks) {
  const p = metaOf.get(x.session_id);
  if (!p) continue;
  for (const o of x.payload?.orders ?? []) {
    if (!bySess.has(x.session_id))
      bySess.set(x.session_id, { name: p.stocks?.[0]?.name ?? p.tickers?.[0], owner: p.owner, buys: 0, sells: 0, turnover: 0, pnl: 0, cost: 0 });
    const a = bySess.get(x.session_id)!;
    const amt = (o.price ?? 0) * (o.quantity ?? 0);
    a.turnover += amt;
    if (o.side === "BUY") { a.buys += 1; a.cost += amt * BUY_RATE; } else { a.sells += 1; a.cost += amt * SELL_RATE; }
  }
}
if (bySess.size) {
  for (const [id, a] of bySess) {
    const p = metaOf.get(id);
    a.pnl = (p.portfolioValue ?? p.initialCash ?? 0) - (p.initialCash ?? 0);
  }
  console.log("\n[비용 분해] 종목        소유자 매수/매도  회전금액     실현손익   거래비용   비용제외");
  let tp = 0, tc = 0;
  for (const [, a] of [...bySess].sort((x, y) => x[1].pnl - y[1].pnl)) {
    tp += a.pnl; tc += a.cost;
    console.log(
      `  ${String(a.name).padEnd(12)} ${String(a.owner).padEnd(5)} ${String(a.buys)}/${String(a.sells).padEnd(4)} ${Math.round(a.turnover).toLocaleString().padStart(11)} ${Math.round(a.pnl).toLocaleString().padStart(10)}원 ${Math.round(a.cost).toLocaleString().padStart(8)}원 ${Math.round(a.pnl + a.cost).toLocaleString().padStart(9)}원`,
    );
  }
  console.log(`  합계: 실현 ${Math.round(tp).toLocaleString()}원 = 가격손익 ${Math.round(tp + tc).toLocaleString()}원 + 비용 ${Math.round(-tc).toLocaleString()}원`);
  if (tp < 0) console.log(`  → ★손실 중 거래비용 비중 ${((tc / Math.abs(tp)) * 100).toFixed(0)}%`);
}

// ─── 청산 사유 ────────────────────────────────────────────────────────────────
const exitKinds: Record<string, number> = {};
for (const x of ticks) {
  if (!metaOf.has(x.session_id)) continue;
  if (!(x.payload?.orders ?? []).some((o: { side: string; price: number | null; quantity: number | null }) => o.side === "SELL")) continue;
  const r = String(x.payload.decision?.rationale ?? "");
  const kind = r.includes("손절선") ? "손절선 이탈" : r.includes("익절") ? "익절 목표 도달"
    : r.includes("강제 청산") ? "장막판 강제청산" : "판단(judge)";
  exitKinds[kind] = (exitKinds[kind] ?? 0) + 1;
}
if (Object.keys(exitKinds).length)
  console.log(`\n[청산 사유] ${Object.entries(exitKinds).map(([k, v]) => `${k} ${v}`).join(" / ")}`);

const stuck = sessions.filter((x: TickRow) => x.status === "running" && (x.payload?.startedAt ?? "") < `${day}T23:59`);
if (stuck.length)
  console.log(`\n⚠️ running 잔존 세션 ${stuck.length}건: ${stuck.map((x: TickRow) => `${x.payload?.stocks?.[0]?.name ?? "?"}(${x.payload?.owner})`).join(", ")}`);
