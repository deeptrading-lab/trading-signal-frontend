/**
 * Phase 1b 검증1 — 아웃오브샘플(2026-06) 픽스처 수집 + 유니버스 재구성.
 *
 *   npx tsx scripts/signal/collect-oos.mts
 *
 * 6월엔 오토파일럿 선정 기록이 없으므로 **스크리너 하드필터를 데이터로 근사**한다(사전 등록 문서
 * `docs/analysis/signal-edge-phase1b-preregistration.md` 검증1):
 *   당일 고가가 전일 종가 대비 +1% 이상 도달 · 당일 등락 +25% 이하 · 종가 1,000~300,000원
 * 후보 풀 = Phase 1a 유니버스에 등장한 종목(관측 가능 종목으로 한정 — 사전 등록대로).
 *
 * 출력: __fixtures__oos__/<ticker>_<yyyymmdd>_1m.json + universe.json(선정 결과)
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const IN = fileURLToPath(new URL("./__fixtures__/", import.meta.url));
const OUT = fileURLToPath(new URL("./__fixtures__oos__/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

const { fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
const { fetchDailyChunked, toYyyymmdd } = await import("@/lib/api/kis/chartChunked");

// 사전 등록된 하드필터 값(= AUTOPILOT_* 상수와 동일)
const MIN_CHANGE_PCT = 1.0, MAX_CHANGE_PCT = 25.0, MIN_PRICE = 1_000, MAX_PRICE = 300_000;
const OOS_FROM = "20260601", OOS_TO = "20260630";
const PRIOR_DAYS = 3;

// ── 후보 풀 = Phase 1a 유니버스 종목 ─────────────────────────────────────────
const pool = [...new Set(
  fs.readdirSync(IN).filter((f) => f.endsWith("_1m.json")).map((f) => f.split("_")[0]),
)];
console.log(`후보 풀: ${pool.length}종목 (Phase 1a 유니버스)`);

// ── 일봉으로 유니버스 선정 (하드필터) ───────────────────────────────────────
type Pick = { ticker: string; day: string; changePct: number };
const picks: Pick[] = [];
const dailyCache = new Map<string, Array<{ date: string; open: number; high: number; low: number; close: number }>>();
let scanned = 0;
for (const ticker of pool) {
  scanned++;
  let daily;
  try {
    daily = await fetchDailyChunked(ticker, "20260520", OOS_TO);
  } catch { continue; }
  dailyCache.set(ticker, daily);
  for (let i = 1; i < daily.length; i++) {
    const d = daily[i], prev = daily[i - 1];
    const day = d.date.slice(0, 10).replaceAll("-", "");
    if (day < OOS_FROM || day > OOS_TO) continue;
    if (!prev.close) continue;
    const maxGain = ((d.high - prev.close) / prev.close) * 100;
    const closeChg = ((d.close - prev.close) / prev.close) * 100;
    if (maxGain < MIN_CHANGE_PCT) continue;
    if (closeChg > MAX_CHANGE_PCT) continue;
    if (d.close < MIN_PRICE || d.close > MAX_PRICE) continue;
    picks.push({ ticker, day, changePct: closeChg });
  }
  if (scanned % 20 === 0) console.log(`  일봉 스캔 ${scanned}/${pool.length} · 누적 선정 ${picks.length}`);
}
const oosDays = [...new Set(picks.map((p) => p.day))].sort();
console.log(`\n유니버스 선정: ${picks.length} 종목·일 · ${oosDays.length}거래일 (${oosDays[0]} ~ ${oosDays.at(-1)})`);
fs.writeFileSync(`${OUT}universe.json`, JSON.stringify(picks, null, 2));

// ── 거래일 달력 (일봉에서 도출) ─────────────────────────────────────────────
const anyDaily = dailyCache.get("005930") ?? [...dailyCache.values()][0] ?? [];
const tradingDays = anyDaily.map((d) => d.date.slice(0, 10).replaceAll("-", "")).sort();

// ── 1분봉 수집: 선정일 + 이전 3거래일(warmup) ───────────────────────────────
const need = new Map<string, Set<string>>();
for (const p of picks) {
  const idx = tradingDays.indexOf(p.day);
  const days = idx >= 0 ? tradingDays.slice(Math.max(0, idx - PRIOR_DAYS), idx + 1) : [p.day];
  if (!need.has(p.ticker)) need.set(p.ticker, new Set());
  for (const d of days) need.get(p.ticker)!.add(d);
}
const total = [...need.values()].reduce((a, s) => a + s.size, 0);
console.log(`수집 대상: (종목,일) ${total}건\n`);

let done = 0, skipped = 0, empty = 0;
const t0 = Date.now();
for (const [ticker, days] of need) {
  for (const day of [...days].sort()) {
    const f = `${OUT}${ticker}_${day}_1m.json`;
    if (fs.existsSync(f)) { skipped++; continue; }
    const cs: StockMinuteCandle[] = await fetchMinuteCandlesForDate(ticker, day, 1).catch(() => []);
    fs.writeFileSync(f, JSON.stringify(cs));
    if (cs.length === 0) empty++;
    done++;
    if (done % 50 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${done}/${total - skipped} (${el.toFixed(0)}s · 잔여 약 ${(((total - skipped - done) * el) / done / 60).toFixed(1)}분)`);
    }
  }
}
console.log(`\n완료: 신규 ${done} · 스킵 ${skipped} · 빈응답 ${empty} · ${((Date.now() - t0) / 1000 / 60).toFixed(1)}분`);
