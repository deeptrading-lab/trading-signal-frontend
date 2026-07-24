/**
 * 오토파일럿 스크리너 선정 품질 평가 (judge 무관·읽기 전용) — intraday-autopilot.
 *
 *   npx tsx scripts/intraday/screener-eval.mts            # 저장된 전 스냅샷 4일+
 *
 * 하는 일: `paper_trading_autopilot_screener_snapshots` 를 적재 → 각 종목이 여러 스윕(10분)에 걸쳐
 *   랭킹에 등장할 때마다 찍힌 가격으로 **forward 가격경로를 재구성**(KIS 분봉 재조회·만료 무관, 스냅샷
 *   가격이 곧 10분 샘플 시계열) → 스크리너 점수가 forward range(움직임 폭)를 예측하는지(scoreSpear)
 *   + 뽑은 종목 vs 미선정 상위 vs 탈락 종목의 forward range 비교.
 *
 * 왜 range 인가: 방향(상승)은 이 속도로 예측 불가(judge 트랙 결론)이나 **range(폭)는 예측 가능**하고,
 *   스크리너의 임무는 "단타 기회(=움직임) 큰 메뉴"를 고르는 것 — judge 가 그걸 수익으로 바꾸는지는
 *   별개(daily.mts). 이 도구는 judge 오염 없이 **선정 품질만** 측정한다.
 *
 * 판정: [scoreSpear]가 꾸준히 양(+)이면 점수가 무버를 예측(선정 정상). [뽑음 range%]가 [미선정상위
 *   range%]보다 낮으면 최종 선정 마진에서 무버를 놓치는 것(2차 스코어링 결함). 2026-07-21 기준선:
 *   scoreSpear +0.19(4일 양)·뽑음 3.19 < 미선정상위 3.51(ATR 삼각 결함 → 포화로 수정).
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { AutopilotScreenerSnapshot } from "@/lib/types/paperTrading/autopilot";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { isSupabaseEgressDisabled } = await import("@/lib/server/supabase/egressGuard");
if (isSupabaseEgressDisabled()) {
  console.error("Supabase Egress 차단 모드라 스크리너 평가의 원격 데이터 적재를 건너뜁니다.");
  process.exit(0);
}
const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: key, Authorization: `Bearer ${key}` };
const q = async <T>(p: string): Promise<T[]> => {
  const r = await fetch(`${url}/rest/v1/${p}`, { headers: H });
  return r.ok ? ((await r.json()) as T[]) : [];
};
const kstD = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
const HORIZON_MIN = Number(process.argv[2]) || 60;

function spearman(pairs: [number, number][]): number | null {
  const n = pairs.length;
  if (n < 5) return null;
  const rank = (vals: number[]) => {
    const idx = vals.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const r = Array(n);
    for (let k = 0; k < n; k++) r[idx[k][1]] = k + 1;
    return r;
  };
  const rx = rank(pairs.map((p) => p[0]));
  const ry = rank(pairs.map((p) => p[1]));
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "—");

const snaps = (await q<{ payload: AutopilotScreenerSnapshot }>("paper_trading_autopilot_screener_snapshots?select=payload&order=created_at.asc&limit=1000"))
  .map((row) => row.payload)
  .filter((snapshot) => snapshot.status === "ok");
const byDate: Record<string, AutopilotScreenerSnapshot[]> = {};
for (const s of snaps) (byDate[kstD(s.at)] ??= []).push(s);

const poolPairs: [number, number][] = [];
const pool = { picked: [] as number[], passed: [] as number[], rejected: [] as number[] };
type ForwardMove = { range: number; ret: number };

console.log(`\n지평 ${HORIZON_MIN}분 · forwardRange = 향후 (고가−저가)/기준가 · scoreSpear = 점수 vs range 순위상관\n`);
console.log("날짜        | 후보 | scoreSpear | retSpear | 뽑음 range% | 미선정상위 % | 탈락 % | 뽑음 ret%");
for (const [date, ds] of Object.entries(byDate).sort()) {
  const path: Record<string, [number, number][]> = {};
  const t0 = new Date(ds[0].at).getTime();
  for (const s of ds)
    for (const c of [...(s.ranking ?? []), ...(s.rejected ?? [])]) {
      if (!(c.price > 0)) continue;
      (path[c.ticker] ??= []).push([(new Date(s.at).getTime() - t0) / 60000, c.price]);
    }
  const fwd = (ticker: string, atMin: number) => {
    const pts = (path[ticker] ?? []).filter(([m]) => m >= atMin && m <= atMin + HORIZON_MIN);
    if (pts.length < 2) return null;
    const base = pts[0][1];
    const prices = pts.map((p) => p[1]);
    return {
      range: ((Math.max(...prices) - Math.min(...prices)) / base) * 100,
      ret: ((pts.at(-1)![1] - base) / base) * 100,
    };
  };
  const pickedAt = new Set<string>();
  for (const s of ds)
    for (const p of s.picks ?? [])
      pickedAt.add(`${p.ticker}@${Math.round((new Date(s.at).getTime() - t0) / 60000)}`);

  const pairs: [number, number][] = [];
  const retPairs: [number, number][] = [];
  const grp = { picked: [] as ForwardMove[], passed: [] as ForwardMove[], rejected: [] as number[] };
  for (const s of ds) {
    const m = (new Date(s.at).getTime() - t0) / 60000;
    const ranking = s.ranking ?? [];
    for (let i = 0; i < ranking.length; i++) {
      const c = ranking[i];
      const f = fwd(c.ticker, m);
      if (!f) continue;
      const score = c.finalScore ?? c.score1;
      pairs.push([score, f.range]);
      retPairs.push([score, f.ret]);
      if (pickedAt.has(`${c.ticker}@${Math.round(m)}`)) grp.picked.push(f);
      else if (i < 5) grp.passed.push(f);
    }
    for (const c of s.rejected ?? []) {
      const f = fwd(c.ticker, m);
      if (f) grp.rejected.push(f.range);
    }
  }
  poolPairs.push(...pairs);
  pool.picked.push(...grp.picked.map((f) => f.range));
  pool.passed.push(...grp.passed.map((f) => f.range));
  pool.rejected.push(...grp.rejected);
  console.log(
    `${date} | ${String(pairs.length).padStart(4)} | ${String(spearman(pairs)?.toFixed(3) ?? "—").padStart(10)} | ${String(spearman(retPairs)?.toFixed(3) ?? "—").padStart(8)} | ${f2(mean(grp.picked.map((f) => f.range))).padStart(10)} | ${f2(mean(grp.passed.map((f) => f.range))).padStart(11)} | ${f2(mean(grp.rejected)).padStart(6)} | ${f2(mean(grp.picked.map((f) => f.ret))).padStart(8)}`,
  );
}
console.log("\n── 전체 풀링 ──");
console.log(`scoreSpear(점수→forwardRange): ${spearman(poolPairs)?.toFixed(3)} (n=${poolPairs.length})`);
console.log(
  `평균 forwardRange% — 뽑음 ${f2(mean(pool.picked))}(n=${pool.picked.length}) · 미선정상위 ${f2(mean(pool.passed))}(n=${pool.passed.length}) · 탈락 ${f2(mean(pool.rejected))}(n=${pool.rejected.length})`,
);
