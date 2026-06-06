/**
 * 실데이터 백테스트 러너 — KIS 실종목 일봉으로 규칙 엔진을 검증.
 *
 * ⚠️ 네트워크 호출 + 파일 쓰기. `npm run test`(CI)에서는 **스킵**되고, 명시 실행만 동작:
 *
 *   RUN_LIVE_BACKTEST=1 npx vitest run lib/signal/backtest/__live__/liveBacktest.test.ts
 *
 * 동작: ① .env.local 로드 → ② KIS 토큰(파일 캐시 — 1분당 1회 발급 한도 회피) → ③ 일봉 청크 페치
 *       → ④ 스냅샷 __fixtures__/<ticker>.json 저장 → ⑤ backtest() → ⑥ 적중률·손익비·MDD·attribution 리포트.
 *
 * 토큰은 `.kis-token.json`(gitignore, 절대 커밋 금지)에 24h 캐시 → 재실행마다 재발급 안 함.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const ENABLED = process.env.RUN_LIVE_BACKTEST === "1";

const TICKERS = ["005930", "000660", "247540"]; // 코스피2 + 코스닥1
const DAYS = 1100; // ≈3년
const CHUNK_DAYS = 130;
const DIR = __dirname;
const FIXTURE_DIR = path.join(DIR, "__fixtures__");
const TOKEN_FILE = path.join(DIR, ".kis-token.json");

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

/** 토큰 — 파일 캐시 우선(1분당 1회 발급 한도). miss/만료 시 1회 발급 후 저장. */
async function getToken(): Promise<string> {
  if (existsSync(TOKEN_FILE)) {
    const c = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
    if (c.expiresAt - 60_000 > Date.now()) return c.token as string;
  }
  const { getAccessToken } = await import("@/lib/api/kis/token");
  const token = await getAccessToken();
  // KIS 토큰 수명 24h — 보수적으로 12h 캐시.
  writeFileSync(TOKEN_FILE, JSON.stringify({ token, expiresAt: Date.now() + 12 * 3600_000 }));
  return token;
}

function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchChunked(ticker: string, token: string): Promise<StockDailyCandle[]> {
  const { getKisClient } = await import("@/lib/api/kis/client");
  const { mapDailyCandle } = await import("@/lib/api/kis/mappers");
  const client = getKisClient();
  const headers = {
    authorization: `Bearer ${token}`,
    appkey: process.env.KIS_APP_KEY ?? "",
    appsecret: process.env.KIS_APP_SECRET ?? "",
    tr_id: "FHKST03010100",
    custtype: "P" as const,
  };

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - DAYS);

  const all: StockDailyCandle[] = [];
  let chunkTo = new Date(to);
  while (chunkTo >= from) {
    const chunkFrom = new Date(chunkTo);
    chunkFrom.setDate(chunkFrom.getDate() - CHUNK_DAYS + 1);
    const eff = chunkFrom < from ? from : chunkFrom;
    const res = await client.get(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: ticker,
          FID_INPUT_DATE_1: yyyymmdd(eff),
          FID_INPUT_DATE_2: yyyymmdd(chunkTo),
          FID_PERIOD_DIV_CODE: "D",
          FID_ORG_ADJ_PRC: "0",
        },
      },
    );
    const out2 = (res.data?.output2 ?? []) as Parameters<typeof mapDailyCandle>[0][];
    all.push(...out2.map(mapDailyCandle));
    chunkTo = new Date(eff);
    chunkTo.setDate(chunkTo.getDate() - 1);
    await new Promise((r) => setTimeout(r, 150));
  }
  const seen = new Set<string>();
  return all
    .filter((c) => (seen.has(c.date) ? false : (seen.add(c.date), true)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

describe.skipIf(!ENABLED)("실데이터 백테스트", () => {
  beforeAll(() => {
    loadEnvLocal();
    if (!existsSync(FIXTURE_DIR)) mkdirSync(FIXTURE_DIR, { recursive: true });
  });

  it("KIS 실종목 일봉 → backtest 리포트", { timeout: 180_000 }, async () => {
    const { backtest } = await import("@/lib/signal/backtest/run");
    const token = await getToken();

    const barrier = { atrMult: 2, horizonDays: 20 };
    const line = (label: string, m: import("@/lib/types/signal").BacktestMetrics) =>
      `  ${label.padEnd(10)} 표본 ${String(m.trades).padStart(4)} | 적중률 ${(m.hitRate * 100).toFixed(1)}% | ` +
      `손익비 ${m.profitFactor.toFixed(2)} | 평균수익 ${m.avgReturnPct.toFixed(2)}% | W/L/N ${m.wins}/${m.losses}/${m.neutrals}`;

    for (const ticker of TICKERS) {
      const candles = await fetchChunked(ticker, token);
      writeFileSync(path.join(FIXTURE_DIR, `${ticker}.json`), JSON.stringify(candles));
      expect(candles.length).toBeGreaterThan(200);

      // 레짐 필터 off vs on 비교 — 역추세 BUY veto 효과 측정.
      const off = backtest(candles, { barrier, signal: { regimeFilter: false } });
      const on = backtest(candles, { barrier, signal: { regimeFilter: true } });
      console.log(
        `\n===== ${ticker} (${candles.length}봉, ${candles[0].date}~${candles[candles.length - 1].date}) =====\n` +
          line("필터 off", off.metrics) +
          "\n" +
          line("필터 on", on.metrics) +
          "\n  규칙별 attribution(off, hitRate 오름차순 — 위가 문제 규칙):\n" +
          off.attribution
            .map((a) => `    ${a.key.padEnd(20)} n=${String(a.count).padStart(4)} hit=${(a.hitRate * 100).toFixed(1)}% avgR=${a.avgReturnPct.toFixed(2)}%`)
            .join("\n"),
      );
    }
  });
});
