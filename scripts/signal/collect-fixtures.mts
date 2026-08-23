/**
 * Phase 0 — 신호 감사용 1분봉 픽스처 수집 (signal-edge-audit PRD §7).
 *
 *   npx tsx scripts/signal/collect-fixtures.mts            # 최근 13거래일 유니버스
 *   npx tsx scripts/signal/collect-fixtures.mts 2026-07-02 # 시작일 지정
 *
 * 유니버스 = **오토파일럿이 실제로 고른 종목**(paper_trading_sessions). 감사는 배포 분포에서
 * 해야 의미가 있으므로 랜덤/대형주 표본을 쓰지 않는다(PRD §9-1).
 *
 * 각 대상일마다 라이브와 동일하게 **이전 3거래일**을 함께 받는다 — 5분봉 profile.minBars=156 이
 * 하루(78봉)로는 안 차기 때문(라이브 INTRADAY_PRIOR_DAYS=3 과 정합).
 *
 * 출력: scripts/signal/__fixtures__/<ticker>_<yyyymmdd>_1m.json (이미 있으면 스킵 — 재실행 안전)
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const OUT = fileURLToPath(new URL("./__fixtures__/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

const { fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");

const PRIOR_DAYS = 3; // 라이브 INTRADAY_PRIOR_DAYS 와 정합
const START = process.argv[2] ?? "2026-07-21"; // 기본: 최근 13거래일
const ymd = (d: string) => d.replaceAll("-", "");

// ── 1. 유니버스 적재 (오토파일럿 선정 종목) ──────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sessions: Array<{ payload: { startedAt?: string; stocks?: Array<{ ticker: string; name: string }>; tickers?: string[] } }> =
  await fetch(`${url}/rest/v1/paper_trading_sessions?select=payload&order=updated_at.desc&limit=1000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }).then((r) => r.json());

/** 대상일 → 종목 집합. */
const targets = new Map<string, Set<string>>();
const names = new Map<string, string>();
for (const s of sessions) {
  const p = s.payload ?? {};
  const day = (p.startedAt ?? "").slice(0, 10);
  const ticker = p.stocks?.[0]?.ticker ?? p.tickers?.[0];
  if (!day || !ticker || day < START) continue;
  if (!targets.has(day)) targets.set(day, new Set());
  targets.get(day)!.add(ticker);
  if (p.stocks?.[0]?.name) names.set(ticker, p.stocks[0].name);
}
const targetDays = [...targets.keys()].sort();
console.log(`유니버스: ${targetDays.length}거래일 (${targetDays[0]} ~ ${targetDays.at(-1)}) · 종목·일 ${[...targets.values()].reduce((a, s) => a + s.size, 0)}건`);

// ── 2. 거래일 달력 — 지수 종목으로 한 번 훑어 휴장일 제거 ────────────────────
/** START 3주 전부터 마지막 대상일까지 실제 거래일 목록(빈 응답 = 휴장). */
const calStart = new Date(`${START}T00:00:00Z`);
calStart.setUTCDate(calStart.getUTCDate() - 21);
const calendar: string[] = [];
for (let d = new Date(calStart); d <= new Date(`${targetDays.at(-1)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
  const iso = d.toISOString().slice(0, 10);
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) continue; // 주말 선제 제외(호출 절약)
  calendar.push(iso);
}
console.log(`달력 후보 ${calendar.length}일 — 삼성전자로 거래일 확정 중…`);
const tradingDays: string[] = [];
for (const day of calendar) {
  const f = `${OUT}005930_${ymd(day)}_1m.json`;
  if (fs.existsSync(f)) {
    if (JSON.parse(fs.readFileSync(f, "utf8")).length > 0) tradingDays.push(day);
    continue;
  }
  const cs: StockMinuteCandle[] = await fetchMinuteCandlesForDate("005930", ymd(day), 1).catch(() => []);
  fs.writeFileSync(f, JSON.stringify(cs));
  if (cs.length > 0) tradingDays.push(day);
}
console.log(`거래일 ${tradingDays.length}일 확정`);

// ── 3. 필요한 (종목, 일) 집합 = 대상일 + 각 대상일의 이전 3거래일 ────────────
const need = new Map<string, Set<string>>(); // ticker → days
for (const [day, tickers] of targets) {
  const idx = tradingDays.indexOf(day);
  const days = idx >= 0 ? tradingDays.slice(Math.max(0, idx - PRIOR_DAYS), idx + 1) : [day];
  for (const t of tickers) {
    if (!need.has(t)) need.set(t, new Set());
    for (const d of days) need.get(t)!.add(d);
  }
}
const totalFetch = [...need.values()].reduce((a, s) => a + s.size, 0);
console.log(`수집 대상: 종목 ${need.size}개 · (종목,일) ${totalFetch}건 (이전 ${PRIOR_DAYS}거래일 포함)\n`);

// ── 4. 수집 (디스크 캐시 — 재실행 안전) ──────────────────────────────────────
let done = 0, skipped = 0, empty = 0;
const t0 = Date.now();
for (const [ticker, days] of need) {
  for (const day of [...days].sort()) {
    const f = `${OUT}${ticker}_${ymd(day)}_1m.json`;
    if (fs.existsSync(f)) { skipped++; continue; }
    const cs: StockMinuteCandle[] = await fetchMinuteCandlesForDate(ticker, ymd(day), 1).catch(() => []);
    fs.writeFileSync(f, JSON.stringify(cs));
    if (cs.length === 0) empty++;
    done++;
    if (done % 25 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${done}/${totalFetch - skipped} 수집 (${el.toFixed(0)}s · 잔여 약 ${(((totalFetch - skipped - done) * el) / done / 60).toFixed(1)}분)`);
    }
  }
}
console.log(`\n완료: 신규 ${done} · 캐시 스킵 ${skipped} · 빈응답 ${empty} · ${((Date.now() - t0) / 1000 / 60).toFixed(1)}분`);
console.log(`픽스처 ${fs.readdirSync(OUT).length}개 → ${OUT}`);
