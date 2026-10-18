/**
 * AI 종합분석 방향 품질 진단 (Phase 1) — 읽기 전용.
 *
 *   MARKET_DATA_SOURCE=kis node --env-file=.env.local --import tsx scripts/scorecard/direction-diagnosis.mts
 *
 * PRD `docs/prd/ai-direction-quality.md` §3-1. 판정 규칙 SSOT = `docs/analysis/ai-direction-diagnosis-preregistration.md`.
 * - Supabase: GET 만(채점 원장·판정 본문·분석 큐). DB 쓰기 0.
 * - 게이트: `summarizeDirectionGate` 재사용(재구현 금지).
 * - KIS: 지수·일봉 조회만. MARKET_DATA_SOURCE=kis 로 prod 와 같은 KIS 경로. 야간 점검(21:50~) 전에 실행.
 * 출력: 사람이 읽는 요약 + 마지막에 `=== JSON ===` 아래 전체 측정값 JSON.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { ScorecardRow } from "@/lib/types/scorecard/scorecard";
import type { FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import { getAllScorecardRows } from "@/lib/server/scorecard/scorecardStore";
import { summarizeDirectionGate } from "@/lib/server/scorecard/summarize";
import { getAllAIDecisions } from "@/lib/server/ai/decisionStore";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";
import { fetchIndexDailyChunked } from "@/lib/api/kis/indexChartChunked";
import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import {
  bullShare,
  clusterBootstrapCI,
  demeanByGroup,
  directionScore,
  HOLD_ADVICE_RE,
  SELL_ADVICE_RE,
  isHoldAdvice,
  isoWeekKey,
  judgeA1,
  judgeA3,
  judgeA4,
  judgeA5,
  judgeB1,
  judgeB2,
  judgeB3,
  mean,
  median,
  spearman,
  splitTerciles,
  toPp,
  weekMatchedGate,
  type DiagnosisLabel,
} from "@/lib/server/scorecard/directionDiagnosis";

// ── 사전 등록 상수(바꾸지 말 것) ──
const BOOTSTRAP_ITERATIONS = 2000;
const BOOTSTRAP_SEED = 20261018;
const PRIOR_REGIME_BD = 10; // 직전 국면 = 진입일 이전 10영업일 KOSPI 수익률
const PRE_RETURN_BD = 20; // preReturn20d
const KOSPI_CODE = "0001";
const A5_CUTOFF = "2026-07-13"; // #352
const A4_CUTOFF = "2026-07-29"; // #375
// ── 실행 상수 ──
const KIS_CALL_DELAY_MS = 200;
const DAILY_CACHE_DIR = fileURLToPath(new URL("../signal/__daily__/", import.meta.url));

const pct = (x: number | null, d = 1) => (x === null ? "—" : `${(x * 100).toFixed(d)}%`);
const num = (x: number | null, d = 2) => (x === null ? "—" : x.toFixed(d));
const kstDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
const ymd = (date: string) => date.replaceAll("-", "");
const shiftDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const countBy = <T,>(xs: T[], key: (x: T) => string) =>
  xs.reduce<Record<string, number>>((acc, x) => ((acc[key(x)] = (acc[key(x)] ?? 0) + 1), acc), {});

console.log(`MARKET_DATA_SOURCE=${process.env.MARKET_DATA_SOURCE ?? "(unset)"} · KIS_ENV=${process.env.KIS_ENV ?? "(unset)"}`);
if (process.env.MARKET_DATA_SOURCE !== "kis") {
  console.warn("⚠️ MARKET_DATA_SOURCE 가 kis 가 아니다 — prod 와 다른 일봉 경로(토스 NXT 통합)일 수 있음");
}

// ── 1. 데이터 ──────────────────────────────────────────────
const allRows = await getAllScorecardRows();
if (allRows.length === 0) throw new Error("채점 원장 조회 0행 — Supabase env 확인");
const gate = summarizeDirectionGate(allRows);

const sample = allRows.filter(
  (r) =>
    (r.w2Status === "hit" || r.w2Status === "miss" || r.w2Status === "flat") &&
    r.w2ReturnPct !== null &&
    Number.isFinite(r.w2ReturnPct),
);
const ret = (r: ScorecardRow) => r.w2ReturnPct as number;
const d = (r: ScorecardRow) => directionScore(r.verdict);
const bull = sample.filter((r) => d(r) === 1);
const bear = sample.filter((r) => d(r) === -1);
const entryDates = sample.map((r) => r.entryDate).sort();
console.log(`채점 원장 ${allRows.length}행 · 표본(w2 채점·수익률 유한) ${sample.length}행 · 진입 ${entryDates[0]} ~ ${entryDates.at(-1)}`);

const decisions = await getAllAIDecisions(1000);
console.log(`판정 본문(ai_analysis_decisions) ${decisions.length}건`);

// 분석 큐 소스(H-C1) — GET 만.
const sb = getSupabaseServiceConfig();
type QueueRow = { source: string | null; status: string; created_at: string };
let queueRows: QueueRow[] = [];
if (sb) {
  const res = await fetch(
    `${sb.url}/rest/v1/ai_analysis_queue?select=source,status,created_at&order=created_at.asc&limit=10000`,
    { method: "GET", headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` } },
  );
  queueRows = res.ok ? ((await res.json()) as QueueRow[]) : [];
  if (!res.ok) console.warn(`분석 큐 조회 실패 status=${res.status}`);
}

// KOSPI 지수 일봉.
const kospi = await fetchIndexDailyChunked(KOSPI_CODE, ymd(shiftDays(entryDates[0], -40)), ymd(entryDates.at(-1)!));
console.log(`KOSPI 지수 일봉 ${kospi.length}봉 (${kospi[0]?.date} ~ ${kospi.at(-1)?.date})`);

/** 진입일 이전 N영업일 수익률 — date < entryDate 인 봉만(결정 시점에 알 수 있던 정보). */
function priorReturn(entryDate: string): number | null {
  const prior = kospi.filter((c) => c.date < entryDate);
  if (prior.length < PRIOR_REGIME_BD + 1) return null;
  return prior.at(-1)!.close / prior.at(-1 - PRIOR_REGIME_BD)!.close - 1;
}

/** preReturn20d — 진입일 종가 ÷ 20영업일 전 종가 − 1. */
function preReturn(candles: StockDailyCandle[], entryDate: string): number | null {
  const i = candles.findIndex((c) => c.date === entryDate);
  if (i < PRE_RETURN_BD) return null;
  return candles[i].close / candles[i - PRE_RETURN_BD].close - 1;
}

const preRet = new Map<string, number | null>(); // row.id → preReturn20d
const preSource = { cache: 0, kis: 0, missing: 0 };
const byTicker = new Map<string, ScorecardRow[]>();
for (const r of sample) byTicker.set(r.ticker, [...(byTicker.get(r.ticker) ?? []), r]);
for (const [ticker, rs] of byTicker) {
  const cacheFile = `${DAILY_CACHE_DIR}${ticker}.json`;
  const cached: StockDailyCandle[] = fs.existsSync(cacheFile)
    ? (JSON.parse(fs.readFileSync(cacheFile, "utf8")) as StockDailyCandle[])
    : [];
  let kis: StockDailyCandle[] | null = null;
  for (const r of rs) {
    let v = preReturn(cached, r.entryDate);
    if (v !== null) {
      preSource.cache++;
    } else {
      if (kis === null) {
        const dates = rs.map((x) => x.entryDate).sort();
        await delay(KIS_CALL_DELAY_MS);
        kis = await fetchDailyChunked(ticker, ymd(shiftDays(dates[0], -45)), ymd(dates.at(-1)!)).catch((e: unknown) => {
          console.warn(`  ${ticker} 일봉 실패: ${e instanceof Error ? e.message : String(e)}`);
          return [];
        });
      }
      v = preReturn(kis, r.entryDate);
      if (v !== null) preSource.kis++;
      else preSource.missing++;
    }
    preRet.set(r.id, v);
  }
}
console.log(`preReturn20d: 캐시 ${preSource.cache} · KIS ${preSource.kis} · 결측 ${preSource.missing}`);

const labels: Record<string, DiagnosisLabel> = {};
const out: Record<string, unknown> = {};

// ── (a) 현행 게이트 ─────────────────────────────────────────
console.log("\n[a] 현행 게이트 (summarizeDirectionGate, w2)");
for (const [k, s] of [["강세", gate.bull], ["약세", gate.bear]] as const) {
  console.log(`  ${k}: n=${s.n} 적중 ${s.hits} (${pct(s.hitRate)}) · 찍기 ${pct(s.baseRate)} · 차이 ${num(s.diffPp, 1)}%p · pass=${s.pass}`);
}
console.log(`  표본 ${gate.sample} · 전체 pass=${gate.pass}`);
out.gate = gate;

// ── (b) 가설 ────────────────────────────────────────────────
console.log("\n[b] 가설");

// H-A1
const uw = decisions.filter((x) => x.decision?.verdict === "UNDERWEIGHT");
const uwHold = uw.filter((x) => isHoldAdvice(x.decision.holder_strategy));
const a1Ratio = uw.length ? uwHold.length / uw.length : null;
// 참고(판정 무관): 두 정규식 각각의 매칭 수 — "유지 기본 + 조건부 축소" 문구가 어느 쪽에 걸리는지 보기 위함.
const uwText = uw.map((x) => x.decision.holder_strategy ?? "");
const holdHits = uwText.filter((t) => HOLD_ADVICE_RE.test(t)).length;
const sellHits = uwText.filter((t) => SELL_ADVICE_RE.test(t)).length;
const emptyText = uwText.filter((t) => !t).length;
const holdRows = sample.filter((r) => r.verdict === "HOLD");
const uwRows = sample.filter((r) => r.verdict === "UNDERWEIGHT");
labels["H-A1"] = judgeA1(uw.length, a1Ratio);
out["H-A1"] = {
  decisionsTotal: decisions.length,
  uwDecisions: uw.length,
  holdAdvice: uwHold.length,
  ratio: a1Ratio,
  regexMatches: { holdFamily: holdHits, sellFamily: sellHits, emptyText },
  secondary: {
    uw: { n: uwRows.length, mean: mean(uwRows.map(ret)), median: median(uwRows.map(ret)) },
    hold: { n: holdRows.length, mean: mean(holdRows.map(ret)), median: median(holdRows.map(ret)) },
    usedForJudgement: holdRows.length >= 20,
  },
};
console.log(`  H-A1 UW 본문 ${uw.length}건 중 유지/관망 ${uwHold.length} (${pct(a1Ratio)}) [참고: 보유 계열 매칭 ${holdHits} · 매도 계열 매칭 ${sellHits} · 빈 본문 ${emptyText}] → ${labels["H-A1"]}`);
console.log(`        2차(참고): UW n=${uwRows.length} 평균 ${num(mean(uwRows.map(ret)))}% 중앙 ${num(median(uwRows.map(ret)))}% · HOLD n=${holdRows.length} 평균 ${num(mean(holdRows.map(ret)))}% 중앙 ${num(median(holdRows.map(ret)))}%`);

// H-A2
labels["H-A2"] = "판정 불가";
out["H-A2"] = { reason: "stageStances 는 Phase 0 이후 행에만 존재 — 기존 행으로 측정 불가" };
console.log(`  H-A2 stageStances 없음 → ${labels["H-A2"]}`);

// H-A3
const withRegime = sample
  .map((r) => ({ r, regime: priorReturn(r.entryDate) }))
  .filter((x): x is { r: ScorecardRow; regime: number } => x.regime !== null);
const [rLo, rMid, rHi] = splitTerciles(withRegime, (x) => x.regime);
const tercile = (xs: typeof withRegime) => ({
  n: xs.length,
  regimeRange: xs.length ? [xs[0].regime, xs.at(-1)!.regime] : null,
  bullShare: bullShare(xs.map((x) => x.r.verdict)),
  bearShare: xs.length ? xs.filter((x) => d(x.r) === -1).length / xs.length : null,
});
const a3 = { low: tercile(rLo), mid: tercile(rMid), high: tercile(rHi) };
const a3Diff =
  a3.high.bullShare !== null && a3.low.bullShare !== null ? toPp(a3.high.bullShare, a3.low.bullShare) : null;
labels["H-A3"] = judgeA3(Math.min(rLo.length, rMid.length, rHi.length), a3Diff);
out["H-A3"] = { rowsWithRegime: withRegime.length, ...a3, diffPp: a3Diff };
console.log(`  H-A3 직전 10영업일 KOSPI 3분위 (n ${rLo.length}/${rMid.length}/${rHi.length}) 강세군 비율 하위 ${pct(a3.low.bullShare)} · 중위 ${pct(a3.mid.bullShare)} · 상위 ${pct(a3.high.bullShare)} · 상위−하위 ${num(a3Diff, 1)}%p → ${labels["H-A3"]}`);

// H-A4 / H-A5 — decided_at 의 KST 날짜 기준.
const dec = (r: ScorecardRow) => kstDate(r.decidedAt);
const pre352 = sample.filter((r) => dec(r) < A5_CUTOFF);
const mid352 = sample.filter((r) => dec(r) >= A5_CUTOFF && dec(r) < A4_CUTOFF);
const pre375 = sample.filter((r) => dec(r) < A4_CUTOFF);
const post375 = sample.filter((r) => dec(r) >= A4_CUTOFF);
const share = (rs: ScorecardRow[]) => bullShare(rs.map((r) => r.verdict));
labels["H-A4"] = judgeA4(share(pre375), post375.length, share(post375));
out["H-A4"] = {
  before: { n: pre375.length, bullShare: share(pre375) },
  after: { n: post375.length, bullShare: share(post375) },
};
console.log(`  H-A4 7/29 이전 n=${pre375.length} 강세군 ${pct(share(pre375))} · 이후 n=${post375.length} ${pct(share(post375))} → ${labels["H-A4"]}`);
const a5Delta =
  share(mid352) !== null && share(pre352) !== null ? toPp(share(mid352)!, share(pre352)!) : null;
labels["H-A5"] = judgeA5(pre352.length, mid352.length, a5Delta);
out["H-A5"] = {
  before: { n: pre352.length, bullShare: share(pre352) },
  after: { n: mid352.length, bullShare: share(mid352) },
  deltaPp: a5Delta,
};
console.log(`  H-A5 7/13 이전 n=${pre352.length} 강세군 ${pct(share(pre352))} · 7/13~7/28 n=${mid352.length} ${pct(share(mid352))} · Δ ${num(a5Delta, 1)}%p → ${labels["H-A5"]}`);

// H-B1
const exRows = sample.filter((r) => r.w2ExcessReturnPct !== null && Number.isFinite(r.w2ExcessReturnPct));
const weekOf = (r: ScorecardRow) => isoWeekKey(r.entryDate);
const demeaned = demeanByGroup(exRows.map((r) => r.w2ExcessReturnPct as number), exRows.map(weekOf));
const b1Items = exRows.map((r, i) => ({ week: weekOf(r), d: d(r), y: demeaned[i] }));
const rho = spearman(b1Items.map((x) => x.d), b1Items.map((x) => x.y));
const ci = clusterBootstrapCI(
  b1Items,
  (x) => x.week,
  (s) => spearman(s.map((x) => x.d), s.map((x) => x.y)),
  BOOTSTRAP_ITERATIONS,
  BOOTSTRAP_SEED,
);
const uniqueWeeks = new Set(b1Items.map((x) => x.week)).size;
labels["H-B1"] = judgeB1(uniqueWeeks, ci.lo, ci.hi);
const wm = weekMatchedGate(sample);
out["H-B1"] = { n: b1Items.length, uniqueWeeks, rho, ci, weekMatchedGate: wm };
console.log(`  H-B1 n=${b1Items.length} 주 ${uniqueWeeks}개 ρ=${num(rho, 3)} 95% [${num(ci.lo, 3)}, ${num(ci.hi, 3)}] (유효 재표집 ${ci.valid}/${ci.iterations}) → ${labels["H-B1"]}`);
console.log(`        병기 진입 주 찍기: 강세 n=${wm.bull.n} ${pct(wm.bull.hitRate)} vs ${pct(wm.bull.baseRate)} (${num(wm.bull.diffPp, 1)}%p) · 약세 n=${wm.bear.n} ${pct(wm.bear.hitRate)} vs ${pct(wm.bear.baseRate)} (${num(wm.bear.diffPp, 1)}%p)`);

// H-B2 — 강세군+약세군. 판정은 초과수익 유한 행(같은 표본)으로.
const dirRows = [...bull, ...bear];
const absHit = (r: ScorecardRow) => (d(r) === 1 ? ret(r) > 0 : ret(r) < 0);
const exHit = (r: ScorecardRow) => (d(r) === 1 ? (r.w2ExcessReturnPct as number) > 0 : (r.w2ExcessReturnPct as number) < 0);
const dirEx = dirRows.filter((r) => r.w2ExcessReturnPct !== null && Number.isFinite(r.w2ExcessReturnPct));
const absRate = dirEx.length ? dirEx.filter(absHit).length / dirEx.length : null;
const exRate = dirEx.length ? dirEx.filter(exHit).length / dirEx.length : null;
const b2Diff = absRate !== null && exRate !== null ? toPp(absRate, exRate) : null;
labels["H-B2"] = judgeB2(b2Diff);
out["H-B2"] = {
  n: dirEx.length,
  nAll: dirRows.length,
  absHitRate: absRate,
  excessHitRate: exRate,
  absHitRateAllRows: dirRows.length ? dirRows.filter(absHit).length / dirRows.length : null,
  diffPp: b2Diff,
};
console.log(`  H-B2 n=${dirEx.length}/${dirRows.length} 절대 ${pct(absRate)} − 초과 ${pct(exRate)} = ${num(b2Diff, 1)}%p → ${labels["H-B2"]}`);

// H-B3
const withPre = sample
  .map((r) => ({ r, pre: preRet.get(r.id) ?? null }))
  .filter((x): x is { r: ScorecardRow; pre: number } => x.pre !== null);
const bearPre = withPre.filter((x) => d(x.r) === -1).map((x) => x.pre);
const nonBearPre = withPre.filter((x) => d(x.r) !== -1).map((x) => x.pre);
const medBear = median(bearPre);
const medNonBear = median(nonBearPre);
const b3MedDiff = medBear !== null && medNonBear !== null ? toPp(medBear, medNonBear) : null;
const [pLo, pMid, pHi] = splitTerciles(withPre, (x) => x.pre);
const loBear = pLo.filter((x) => d(x.r) === -1);
const loBearHit = loBear.length ? loBear.filter((x) => ret(x.r) < 0).length / loBear.length : null;
const loDown = pLo.length ? pLo.filter((x) => ret(x.r) < 0).length / pLo.length : null;
labels["H-B3"] = judgeB3(loBear.length, b3MedDiff, loBearHit, loDown);
const tercileVerdicts = (xs: typeof withPre) => countBy(xs, (x) => x.r.verdict);
out["H-B3"] = {
  rowsWithPreReturn: withPre.length,
  preSource,
  bear: { n: bearPre.length, median: medBear },
  nonBear: { n: nonBearPre.length, median: medNonBear },
  medianDiffPp: b3MedDiff,
  terciles: {
    low: { n: pLo.length, range: [pLo[0]?.pre, pLo.at(-1)?.pre], verdicts: tercileVerdicts(pLo) },
    mid: { n: pMid.length, range: [pMid[0]?.pre, pMid.at(-1)?.pre], verdicts: tercileVerdicts(pMid) },
    high: { n: pHi.length, range: [pHi[0]?.pre, pHi.at(-1)?.pre], verdicts: tercileVerdicts(pHi) },
  },
  bottomBear: { n: loBear.length, hitRate: loBearHit },
  bottomDownShare: loDown,
};
console.log(`  H-B3 preReturn20d 중앙값 약세 ${pct(medBear)} (n=${bearPre.length}) vs 비약세 ${pct(medNonBear)} (n=${nonBearPre.length}) 차 ${num(b3MedDiff, 1)}%p`);
console.log(`        하위 분위 n=${pLo.length} 약세 n=${loBear.length} 적중 ${pct(loBearHit)} vs 분위 하락 비율 ${pct(loDown)} → ${labels["H-B3"]}`);

// H-C1 (측정 항목)
labels["H-C1"] = "판정 불가";
const month = (iso: string) => kstDate(iso).slice(0, 7);
const tickerCounts = countBy(sample, (r) => r.ticker);
const c1 = {
  byDecidedMonth: countBy(sample, (r) => month(r.decidedAt)),
  byEntryMonth: countBy(sample, (r) => r.entryDate.slice(0, 7)),
  byProvider: countBy(sample, (r) => r.provider),
  queue: {
    total: queueRows.length,
    bySourceMonth: countBy(queueRows, (q) => `${q.source ?? "null"}|${month(q.created_at)}`),
    byStatus: countBy(queueRows, (q) => q.status),
  },
  uniqueTickers: Object.keys(tickerCounts).length,
  uniqueWeeks: new Set(sample.map(weekOf)).size,
  reanalysisRows: sample.length - Object.keys(tickerCounts).length,
  tickersAnalyzedMoreThanOnce: Object.values(tickerCounts).filter((n) => n > 1).length,
  maxRowsPerTicker: Math.max(...Object.values(tickerCounts)),
  bullByWeek: countBy(bull, weekOf),
  bearByWeek: countBy(bear, weekOf),
  allByWeek: countBy(sample, weekOf),
};
out["H-C1"] = c1;
console.log(`  H-C1 결정 월별 ${JSON.stringify(c1.byDecidedMonth)} · provider ${JSON.stringify(c1.byProvider)}`);
console.log(`        분석 큐 ${queueRows.length}건 소스|월 ${JSON.stringify(c1.queue.bySourceMonth)}`);

// ── (c) 유효 표본 ───────────────────────────────────────────
console.log("\n[c] 유효 표본");
console.log(`  행 ${sample.length} · 고유 종목 ${c1.uniqueTickers} · 고유 진입 주 ${c1.uniqueWeeks} · 중복 재분석 행 ${c1.reanalysisRows} (2회 이상 종목 ${c1.tickersAnalyzedMoreThanOnce}, 최다 ${c1.maxRowsPerTicker}회)`);
console.log(`  진입 주별 전체/강세/약세:`);
for (const w of Object.keys(c1.allByWeek).sort()) {
  console.log(`    ${w}  ${c1.allByWeek[w]} / ${c1.bullByWeek[w] ?? 0} / ${c1.bearByWeek[w] ?? 0}`);
}

// ── (d) 분포 ────────────────────────────────────────────────
const VERDICTS: FinalVerdict[] = ["BUY", "OVERWEIGHT", "HOLD", "UNDERWEIGHT", "REDUCE", "SELL"];
const vCounts = countBy(sample, (r) => r.verdict);
const verdictMeans = Object.fromEntries(
  VERDICTS.map((v) => {
    const rs = sample.filter((r) => r.verdict === v);
    return [v, { n: rs.length, share: rs.length / sample.length, meanReturn: mean(rs.map(ret)), medianReturn: median(rs.map(ret)) }];
  }),
);
out.distribution = {
  verdicts: verdictMeans,
  bullShare: share(sample),
  uwShare: (vCounts.UNDERWEIGHT ?? 0) / sample.length,
  bearShare: bear.length / sample.length,
};
console.log("\n[d] 분포");
for (const v of VERDICTS) {
  const m = verdictMeans[v];
  console.log(`  ${v.padEnd(11)} ${String(m.n).padStart(3)} (${pct(m.share)}) 2주 평균 ${num(m.meanReturn)}% 중앙 ${num(m.medianReturn)}%`);
}
console.log(`  강세군 ${pct(share(sample))} · 약세군 ${pct(bear.length / sample.length)} · UW ${pct((vCounts.UNDERWEIGHT ?? 0) / sample.length)}`);

console.log("\n[라벨]");
for (const [k, v] of Object.entries(labels)) console.log(`  ${k} ${v}`);

console.log("\n=== JSON ===");
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), sampleRows: sample.length, labels, ...out }, null, 2));
