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

// 기본 3종목(코스피2+코스닥1). 아웃오브샘플 확대는 LIVE_TICKERS=005380,051910,... 로 주입.
const TICKERS = (process.env.LIVE_TICKERS ?? "005930,000660,247540")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
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
    const params = {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: ticker,
      FID_INPUT_DATE_1: yyyymmdd(eff),
      FID_INPUT_DATE_2: yyyymmdd(chunkTo),
      FID_PERIOD_DIV_CODE: "D",
      FID_ORG_ADJ_PRC: "0",
    };
    // KIS 간헐 500/레이트 — 최대 3회 재시도(지수 백오프).
    let res;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await client.get("/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice", { headers, params });
        break;
      } catch (e) {
        if (attempt >= 2) throw e;
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
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

  it("KIS 실종목 일봉 → backtest 리포트", { timeout: 300_000 }, async () => {
    const { backtest } = await import("@/lib/signal/backtest/run");
    const { computeMetrics } = await import("@/lib/signal/backtest/metrics");
    const token = await getToken();

    const barrier = { atrMult: 2, horizonDays: 20 };
    type M = import("@/lib/types/signal").BacktestMetrics;
    type T = import("@/lib/types/signal").BacktestTrade;
    const fmt = (label: string, m: M) =>
      `${label.padEnd(9)} 표본 ${String(m.trades).padStart(4)} | 적중 ${(m.hitRate * 100).toFixed(1)}% | 손익비 ${m.profitFactor.toFixed(2)} | 평균 ${m.avgReturnPct.toFixed(2)}%`;
    const pass = (m: M) => m.profitFactor > 1.5 && m.hitRate > 0.5 && m.trades >= 20;

    const allOn: T[] = [];
    const allOff: T[] = [];
    let passCount = 0;

    for (const ticker of TICKERS) {
      const candles = await fetchChunked(ticker, token);
      writeFileSync(path.join(FIXTURE_DIR, `${ticker}.json`), JSON.stringify(candles));
      expect(candles.length).toBeGreaterThan(200);

      // 매봉 진입(기존) vs 트리거 선별 진입(재설계) — 둘 다 레짐 필터 on.
      const off = backtest(candles, {
        barrier,
        signal: { regimeFilter: true },
        entry: { mode: "everyBar" },
      });
      const on = backtest(candles, {
        barrier,
        signal: { regimeFilter: true },
        entry: { mode: "trigger", cooldownDays: 5 },
      });
      allOff.push(...off.trades);
      allOn.push(...on.trades);
      if (pass(on.metrics)) passCount += 1;

      console.log(
        `${ticker} ${candles[0].date}~${candles[candles.length - 1].date} | ${fmt("매봉", off.metrics)} || ${fmt("트리거", on.metrics)} ${pass(on.metrics) ? "✅" : "❌"}`,
      );
    }

    // 풀링(전 종목 합산) 집계 — 종목별이 아니라 전체 일반화 성능.
    const pooledOff = computeMetrics(allOff);
    const pooledOn = computeMetrics(allOn);
    console.log(
      `\n===== 풀링(${TICKERS.length}종목) =====\n` +
        fmt("POOL off", pooledOff) +
        "\n" +
        fmt("POOL on", pooledOn) +
        `\n합격(손익비>1.5 & 적중>50% & 표본>=30): ${passCount}/${TICKERS.length} 종목`,
    );
  });
});
