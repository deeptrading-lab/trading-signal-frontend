/**
 * Phase 1a — 입력 피처 예측력 감사 (signal-edge-audit PRD §4·§5).
 *
 *   npx tsx scripts/signal/edge-audit.mts
 *
 * 질문: **4축·signalScore 등 입력 피처가 미래 수익률을 예측하는가, 그 크기가 왕복비용(0.28%)을 넘는가.**
 * 전략(룰 조합) 레벨이 아니라 그 아래 **피처 레벨**을 잰다 — 기존 intradayDiagnostic 이 비운 자리.
 *
 * 방법
 * - 픽스처(1분봉) → 라이브와 동일 타임프레임(5분)으로 resample, 이전 3거래일을 warmup 으로 앞에 붙임
 * - 각 봉에서 **라이브와 같은 `evaluateIntradaySignal`** 로 피처 산출(감사 대상 = 실제 배포 코드)
 * - 전방 수익률 h ∈ {5,15,30,60}분
 * - 지표: IC(Spearman) 풀링 + **일자별 분포**(H2 표본 부풀림 대비) + **십분위 스프레드**
 *   + **상위 십분위 평균 수익률 vs 0.28%**(H1 크기 판정)
 *
 * regime 은 0(veto 없음)으로 고정한다 — 피처 자체의 예측력을 재는 것이 목적이라 veto 로 표본을
 * 잘라내면 측정이 오염된다. regime 효과는 별도 피처로 따로 본다.
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
const OUT = fileURLToPath(new URL(MODE === "oos" ? "./__fixtures__oos__/" : "./__fixtures__/", import.meta.url));
/** OOS 는 사전 등록된 하드필터가 고른 (종목,일)만 대상. */
const oosSet = MODE === "oos" && fs.existsSync(`${OUT}universe.json`)
  ? new Set((JSON.parse(fs.readFileSync(`${OUT}universe.json`, "utf8")) as Array<{ ticker: string; day: string }>).map((p) => `${p.ticker}|${p.day}`))
  : null;
const { resampleMinuteCandles } = await import("@/lib/api/kis/minuteChartChunked");
const { evaluateIntradaySignal, resolveIntradayProfile } = await import("@/lib/signal/intradayProfile");

const TF = 5; // 라이브 tickIntervalMinutes=5 → INTRADAY_TIMEFRAME_BY_INTERVAL[5]=5
const HORIZONS = [5, 15, 30, 60]; // 분
const COST_PCT = 0.28; // 왕복 비용선
const PROFILE = resolveIntradayProfile(TF);

// ── 픽스처 인덱스 ────────────────────────────────────────────────────────────
type Key = { ticker: string; day: string };
const files = fs.readdirSync(OUT).filter((f) => f.endsWith("_1m.json"));
const byTicker = new Map<string, string[]>(); // ticker → 정렬된 yyyymmdd
for (const f of files) {
  const [ticker, ymd] = f.replace("_1m.json", "").split("_");
  if (!byTicker.has(ticker)) byTicker.set(ticker, []);
  byTicker.get(ticker)!.push(ymd);
}
for (const v of byTicker.values()) v.sort();
const load = (ticker: string, ymd: string): StockMinuteCandle[] => {
  const p = `${OUT}${ticker}_${ymd}_1m.json`;
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
};

// ── 통계 헬퍼 ────────────────────────────────────────────────────────────────
const rank = (v: number[]): number[] => {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(v.length);
  idx.forEach(([, i], k) => (r[i] = k + 1));
  return r;
};
function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 10) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}
const spearman = (xs: number[], ys: number[]) => pearson(rank(xs), rank(ys));
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

// ── 관측 수집 ────────────────────────────────────────────────────────────────
type Obs = { day: string; ticker: string; hhmm: string; feat: Record<string, number>; fwd: Record<number, number>; ex: Record<number, number> };
const obs: Obs[] = [];
const barsPerH = (h: number) => Math.round(h / TF);

let pairs = 0, skippedWarmup = 0;
for (const [ticker, days] of byTicker) {
  for (let di = 0; di < days.length; di++) {
    const target = days[di];
    if (oosSet && !oosSet.has(`${ticker}|${target}`)) continue;
    // warmup = 이전 3거래일(픽스처에 있는 것만)
    const warm = days.slice(Math.max(0, di - 3), di);
    const prior1m = warm.flatMap((d) => load(ticker, d));
    const today1m = load(ticker, target);
    if (today1m.length < 100) continue;
    const all5 = resampleMinuteCandles([...prior1m, ...today1m], TF);
    const today5Start = resampleMinuteCandles(prior1m, TF).length;
    if (all5.length - today5Start < 20) continue;
    pairs++;

    for (let i = today5Start; i < all5.length; i++) {
      if (i + 1 < PROFILE.minBars) { skippedWarmup++; continue; }
      const maxH = Math.max(...HORIZONS);
      if (i + barsPerH(maxH) >= all5.length) break; // 전방 수익률 확보 불가
      let sig;
      try { sig = evaluateIntradaySignal(all5.slice(0, i + 1), TF, 0); } catch { continue; }
      const base = all5[i].close;
      if (!base) continue;
      const feat: Record<string, number> = { signalScore: sig.score, confidence: sig.confidence };
      for (const a of sig.axes) feat[`축:${a.axis}`] = a.score;
      const fwd: Record<number, number> = {};
      for (const h of HORIZONS) fwd[h] = ((all5[i + barsPerH(h)].close - base) / base) * 100;
      obs.push({ day: target, ticker, hhmm: all5[i].date.slice(11, 16), feat, fwd, ex: {} });
    }
  }
}

// ★일자내 초과수익(excess) — 유니버스가 "당일 +1% 이상 상승한 모멘텀 종목"이라 전체 평균이 이미
// 양수다(베타 착시). 원수익 그대로 보면 드리프트를 엣지로 착각한다. 각 관측에서 **같은 날 평균**을
// 빼서, "언제·어느 종목을 고르는가"의 상대적 선택력만 남긴다.
const dayMean = new Map<string, Record<number, number>>();
for (const d of [...new Set(obs.map((o) => o.day))]) {
  const rows = obs.filter((o) => o.day === d);
  const m: Record<number, number> = {};
  for (const h of HORIZONS) m[h] = mean(rows.map((o) => o.fwd[h]));
  dayMean.set(d, m);
}
for (const o of obs) {
  o.ex = {};
  for (const h of HORIZONS) o.ex[h] = o.fwd[h] - dayMean.get(o.day)![h];
}

const FEATURES = [...new Set(obs.flatMap((o) => Object.keys(o.feat)))];
const days = [...new Set(obs.map((o) => o.day))].sort();
console.log("═".repeat(78));
console.log(`Phase 1a — 입력 피처 예측력 감사 [${MODE === "oos" ? "★아웃오브샘플 2026-06" : "인샘플 2026-07~08"}]`);
console.log(`관측 ${obs.length.toLocaleString()}건 · 종목·일 ${pairs}쌍 · 거래일 ${days.length}일 · ${TF}분봉 · warmup 미달 스킵 ${skippedWarmup.toLocaleString()}`);
console.log(`피처 ${FEATURES.length}개: ${FEATURES.join(", ")}`);
console.log("═".repeat(78));

// ── (A) 일자내 IC — H2(표본 부풀림) 판정의 핵심 ────────────────────────────
// 풀링 IC 는 "좋은 날엔 점수도 높고 수익도 높다"는 **날짜 효과**만으로도 양수가 될 수 있다
// (Simpson's paradox). 실제 매매에 필요한 건 **같은 날 안에서** 더 좋은 시점·종목을 고르는 힘이다.
// 일자내 IC 는 날짜 평균을 빼도 순위가 안 변하므로 excess/raw 동일 — 이것이 오염 없는 측정치.
const MIN_DAY_N = 50;
console.log(`\n[A] IC (Spearman) — 풀링(오염 가능) vs 일자내 평균 / 양(+)의 날 비율`);
console.log(`${"피처".padEnd(15)}${HORIZONS.map((h) => `${h}분`.padStart(21)).join("")}`);
const dayICs = new Map<string, Record<number, number[]>>();
for (const f of FEATURES) {
  const per: Record<number, number[]> = {};
  const cells = HORIZONS.map((h) => {
    const xs: number[] = [], ys: number[] = [];
    for (const o of obs) if (o.feat[f] != null) { xs.push(o.feat[f]); ys.push(o.fwd[h]); }
    const pooled = spearman(xs, ys);
    const ics: number[] = [];
    for (const d of days) {
      const dx: number[] = [], dy: number[] = [];
      for (const o of obs) if (o.day === d && o.feat[f] != null) { dx.push(o.feat[f]); dy.push(o.fwd[h]); }
      if (dx.length < MIN_DAY_N) continue;
      const dic = spearman(dx, dy);
      if (dic != null) ics.push(dic);
    }
    per[h] = ics;
    const m = ics.length ? mean(ics) : NaN;
    const pos = ics.length ? Math.round((ics.filter((v) => v > 0).length / ics.length) * 100) : 0;
    return `${pooled?.toFixed(3) ?? "—"} | ${Number.isNaN(m) ? "—" : (m >= 0 ? "+" : "") + m.toFixed(3)}(${pos}%)`.padStart(21);
  });
  dayICs.set(f, per);
  console.log(`${f.padEnd(15)}${cells.join("")}`);
}
console.log(`  ※ 일자내 IC 는 표본 ${MIN_DAY_N}건 이상인 날만 · 괄호=IC>0 인 날 비율(50% = 동전던지기)`);

// ── (B) ★상위 십분위 초과수익 vs 비용선 — GO 판정 (H1) ─────────────────────
// 유니버스가 "당일 상승 모멘텀 종목"이라 원수익 평균이 이미 양수다. 드리프트를 엣지로 오인하지
// 않도록 **일자내 초과수익**으로 판정한다(베타 착시 제거).
console.log(`\n[B] ★상위 십분위 **초과**수익 (%, 일자내 demean) — 비용선 ${COST_PCT}% 초과가 GO`);
console.log(`${"피처".padEnd(15)}${HORIZONS.map((h) => `${h}분`.padStart(20)).join("")}`);
let anyGo = false;
const goList: string[] = [];
for (const f of FEATURES) {
  const rows0 = obs.filter((o) => o.feat[f] != null);
  const distinct = new Set(rows0.map((o) => o.feat[f])).size;
  const cells = HORIZONS.map((h) => {
    if (rows0.length < 200) return "—".padStart(20);
    const rows = rows0.map((o) => ({ x: o.feat[f], y: o.ex[h] })).sort((a, b) => b.x - a.x);
    const k = Math.max(1, Math.floor(rows.length / 10));
    const top = mean(rows.slice(0, k).map((r) => r.y));
    const bot = mean(rows.slice(-k).map((r) => r.y));
    const ics = dayICs.get(f)?.[h] ?? [];
    const stable = ics.length > 0 && ics.filter((v) => v > 0).length / ics.length >= 0.5;
    const go = top > COST_PCT;
    if (go) { anyGo = true; goList.push(`${f}×${h}분(초과 ${top.toFixed(3)}%, 일자내 안정 ${stable ? "O" : "X"})`); }
    return `${top >= 0 ? "+" : ""}${top.toFixed(3)}${go ? (stable ? " ★" : " △") : ""} (스프${(top - bot).toFixed(2)})`.padStart(20);
  });
  console.log(`${f.padEnd(15)}${cells.join("")}  [고유값 ${distinct}]`);
}
console.log(`  ※ ★=비용선 초과 + 일자내 IC 안정 / △=비용선 초과지만 일자내 불안정(신뢰 못 함)`);
console.log(`  ※ 고유값이 적으면 동점이 많아 십분위가 임의 절단 — 스프레드가 작으면 그 신호를 의심할 것`);

// ── (C) 유니버스 드리프트 공개 ───────────────────────────────────────────────
console.log(`\n[C] 유니버스 베이스라인(무선별 매수 원수익) — 이만큼은 피처와 무관한 드리프트`);
console.log(`  ${HORIZONS.map((h) => `${h}분 ${mean(obs.map((o) => o.fwd[h])).toFixed(3)}%`).join(" · ")}`);
console.log(`  → 스크리너가 '당일 +1% 이상 상승' 종목만 고르는 편향. [B]는 이걸 뺀 값.`);

// ── (B2) ★역방향 — 하위 십분위 초과수익 (사후 발견, 대칭 검증) ─────────────
// [A]·[B]에서 신호가 일자내 **역상관**으로 드러났다. 그렇다면 저득점 봉 매수가 유리해야 한다.
// ⚠️ 이는 **사전 등록하지 않은 사후 분석**이다 — 여기서 나온 수치는 가설이지 결론이 아니며,
//    행동에 옮기기 전 별도 사전등록 검증(아웃오브샘플)이 필요하다.
console.log(`\n[B2] 하위 십분위 초과수익 (%, 역방향 가설) — 일자별 안정성 동반 표기`);
console.log(`${"피처".padEnd(15)}${HORIZONS.map((h) => `${h}분`.padStart(20)).join("")}`);
for (const f of FEATURES) {
  const rows0 = obs.filter((o) => o.feat[f] != null);
  const cells = HORIZONS.map((h) => {
    if (rows0.length < 200) return "—".padStart(20);
    const rows = rows0.map((o) => ({ x: o.feat[f], y: o.ex[h], day: o.day })).sort((a, b) => a.x - b.x);
    const k = Math.max(1, Math.floor(rows.length / 10));
    const bot = mean(rows.slice(0, k).map((r) => r.y));
    // 일자별: 그날 하위 십분위 초과수익이 양(+)인 날 비율
    let pos = 0, tot = 0;
    for (const d of days) {
      const dr = rows0.filter((o) => o.day === d).map((o) => ({ x: o.feat[f], y: o.ex[h] })).sort((a, b) => a.x - b.x);
      if (dr.length < 50) continue;
      const dk = Math.max(1, Math.floor(dr.length / 10));
      tot++; if (mean(dr.slice(0, dk).map((r) => r.y)) > 0) pos++;
    }
    const stable = tot > 0 && pos / tot >= 0.6;
    const over = bot > COST_PCT;
    return `${bot >= 0 ? "+" : ""}${bot.toFixed(3)}${over ? (stable ? " ★" : " △") : ""} (${tot ? Math.round((pos / tot) * 100) : 0}%)`.padStart(20);
  });
  console.log(`${f.padEnd(15)}${cells.join("")}`);
}
console.log(`  ※ 괄호=하위 십분위 초과수익이 양(+)인 날 비율 · ★=비용선 초과 + 60%↑ 날 안정 · △=불안정`);

// ── (D) 시간대 교란 통제 — "신호가 나쁜가" vs "늦은 진입이 나쁜가" ──────────
// 고득점 봉이 장 후반에 몰리면 남은 런웨이가 짧아 수익이 낮게 나온다. 그러면 원인은 신호가 아니라
// 시각이다. **같은 (날짜 × 30분 구간)** 안에서만 IC 를 다시 재 이 대안 설명을 배제한다.
console.log(`\n[D] 시간대 통제 — (날짜×30분 버킷) 내부 IC / 양(+)의 비율`);
const bucketOf = (o: Obs) => `${o.day}|${o.hhmm.slice(0, 2)}${Number(o.hhmm.slice(3, 5)) < 30 ? "A" : "B"}`;
console.log(`${"피처".padEnd(15)}${HORIZONS.map((h) => `${h}분`.padStart(18)).join("")}`);
for (const f of ["signalScore", "축:trend", "축:volatility", "confidence"]) {
  const cells = HORIZONS.map((h) => {
    const ics: number[] = [];
    const buckets = new Map<string, Obs[]>();
    for (const o of obs) { const b = bucketOf(o); if (!buckets.has(b)) buckets.set(b, []); buckets.get(b)!.push(o); }
    for (const rows of buckets.values()) {
      if (rows.length < 30) continue;
      const ic = spearman(rows.map((o) => o.feat[f]), rows.map((o) => o.fwd[h]));
      if (ic != null) ics.push(ic);
    }
    if (!ics.length) return "—".padStart(18);
    const m = mean(ics);
    const pos = Math.round((ics.filter((v) => v > 0).length / ics.length) * 100);
    return `${m >= 0 ? "+" : ""}${m.toFixed(3)}(${pos}%·n${ics.length})`.padStart(18);
  });
  console.log(`${f.padEnd(15)}${cells.join("")}`);
}
console.log(`  ※ 시간대를 고정해도 부호가 그대로면 → 교란이 아니라 신호 자체의 성질`);

console.log(`\n${"─".repeat(78)}`);
if (!anyGo) {
  console.log(`판정(PRD §5): ❌ NO-GO 후보 — 어떤 (피처×호라이즌)도 상위 십분위 초과수익이 비용선 ${COST_PCT}% 미달`);
} else {
  console.log(`판정(PRD §5): 비용선 초과 조합 ${goList.length}건`);
  for (const g of goList) console.log(`   · ${g}`);
  console.log(`   → 일자내 안정 O 인 것만 GO. X 뿐이면 CONDITIONAL(표본 확대) 또는 NO-GO.`);
}
