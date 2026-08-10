/**
 * 일봉 재감사 — KOSPI 전 종목 일봉 수집 (사전 등록 `signal-daily-audit-preregistration.md`).
 *
 *   npx tsx scripts/signal/collect-daily.mts
 *
 * 토스는 커서 페이징이라 2.6년(634봉)을 1콜 ~1.3초에 준다 — 종목당 파일 1개.
 * 출력: __daily__/<ticker>.json (이미 있으면 스킵 — 재실행 안전)
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const OUT = fileURLToPath(new URL("./__daily__/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

const { fetchDailyChunked } = await import("@/lib/api/kis/chartChunked");

const FROM = "20240101", TO = "20260810";
const symbols: { symbols: Array<{ ticker: string; name: string; market: string }> } = JSON.parse(
  fs.readFileSync(`${ROOT}lib/api/kis/symbols.json`, "utf8"),
);
// 사전 등록된 유니버스: KOSPI 전 종목.
const universe = symbols.symbols.filter((s) => s.market === "KOSPI");
console.log(`유니버스: KOSPI ${universe.length}종목 · ${FROM}~${TO}`);
fs.writeFileSync(`${OUT}universe.json`, JSON.stringify(universe, null, 2));

let done = 0, skipped = 0, empty = 0, failed = 0;
const t0 = Date.now();
for (const s of universe) {
  const f = `${OUT}${s.ticker}.json`;
  if (fs.existsSync(f)) { skipped++; continue; }
  let cs: StockDailyCandle[] = [];
  try { cs = await fetchDailyChunked(s.ticker, FROM, TO); } catch { failed++; }
  fs.writeFileSync(f, JSON.stringify(cs));
  if (cs.length === 0) empty++;
  done++;
  if (done % 50 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`  ${done}/${universe.length - skipped} (${el.toFixed(0)}s · 잔여 약 ${(((universe.length - skipped - done) * el) / done / 60).toFixed(1)}분)`);
  }
}
console.log(`\n완료: 신규 ${done} · 스킵 ${skipped} · 빈응답 ${empty} · 실패 ${failed} · ${((Date.now() - t0) / 1000 / 60).toFixed(1)}분`);
