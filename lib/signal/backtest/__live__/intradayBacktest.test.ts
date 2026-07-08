/**
 * ★ 검증 게이트 — 분봉 실데이터 백테스트 (intraday-scalping-agent §3-3, AC-3).
 *
 * "LLM 붙이기 전, 분봉에 2~5% 단타 net-of-cost 엣지가 존재하는가"를 증명한다. 미통과 시 LLM 미연결.
 *
 * ⚠️ 네트워크 호출 + 파일 쓰기. CI(`npm run test`)에서는 **스킵**, 명시 실행만 동작:
 *
 *   RUN_LIVE_INTRADAY=1 npx vitest run lib/signal/backtest/__live__/intradayBacktest.test.ts
 *   # 종목/일수 조정:
 *   RUN_LIVE_INTRADAY=1 INTRADAY_TICKERS=005930,000660,... INTRADAY_DAYS=30 npx vitest run ...
 *
 * 동작: ① .env.local → ② KIS 토큰 → ③ 종목별 과거 N거래일 1분봉 페치(파일 캐시 __fixtures__/min/)
 *       → ④ 3/5/15분 리샘플 bake-off → ⑤ 구조(매물대/박스권) TP·SL + 트리거 진입 backtest
 *       → ⑥ 타임프레임별 net 손익비·적중률·평균·표본 + 합격 종목수 리포트.
 *
 * 통과 기준(AC-3): net PF>1.3 · net avgR>0 · hitRate>0.45 · setup당 sample≥100 · 풀 과반 종목 통과.
 * ⚠️ 게이트는 regimeFilter:false(레짐 veto 없이 setup 순수 엣지 측정). 라이브 루프는 일봉 레짐 veto 를
 *    얹으므로(역추세 진입 차단) 실엣지는 이 측정값 이상이다.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

const ENABLED = process.env.RUN_LIVE_INTRADAY === "1";

// 단타는 고수급/고변동 종목에서 검증해야 한다(005930류 대형주는 일중 레인지<2% 흔함).
// 실제 Phase-2 스캐닝(flow/top10)이 고를 유니버스로 LIVE override 권장.
const TICKERS = (process.env.INTRADAY_TICKERS ?? "005930,000660,247540")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const DAYS = Number(process.env.INTRADAY_DAYS ?? "20"); // 거래일 수
const TIMEFRAMES = [3, 5, 15] as const;
const MAX_CALENDAR_LOOKBACK = DAYS * 2 + 15;
const ROUND_TRIP_COST = 0.4; // 분봉 슬리피지는 일봉보다 큼

/** 타임프레임별 보유 호라이즌(봉) — 단타 익절/시간만료 한도. */
const HORIZON_BARS: Record<number, number> = { 3: 40, 5: 24, 15: 16 };
const COOLDOWN_BARS = 3;

const DIR = __dirname;
const FIXTURE_DIR = path.join(DIR, "__fixtures__", "min");
const TOKEN_FILE = path.join(DIR, ".kis-token.json");

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

async function ensureToken(): Promise<void> {
  // 토큰 파일 캐시(1분당 1회 발급 한도 회피) — token 모듈이 자체 캐시하지만 보수적으로 워밍.
  if (existsSync(TOKEN_FILE)) {
    const c = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
    if (c.expiresAt - 60_000 > Date.now()) return;
  }
  const { getAccessToken } = await import("@/lib/api/kis/token");
  const token = await getAccessToken();
  writeFileSync(TOKEN_FILE, JSON.stringify({ token, expiresAt: Date.now() + 12 * 3600_000 }));
}

function nDaysAgoYyyymmdd(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** 종목 1분봉(과거 N거래일) — 파일 캐시. miss 시 일자별 페치 후 저장. */
async function loadOneMinFixture(ticker: string): Promise<StockMinuteCandle[]> {
  const file = path.join(FIXTURE_DIR, `${ticker}_1m.json`);
  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, "utf8")) as StockMinuteCandle[];
  }
  const { fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
  const acc: StockMinuteCandle[] = [];
  let filled = 0;
  for (let back = 1; back <= MAX_CALENDAR_LOOKBACK && filled < DAYS; back++) {
    const date = nDaysAgoYyyymmdd(back);
    try {
      const day = await fetchMinuteCandlesForDate(ticker, date, 1); // 1=리샘플 없이 1분봉
      if (day.length > 0) {
        acc.push(...day);
        filled += 1;
      }
    } catch (e) {
      // 한 날 페치 실패(KIS 간헐 5xx 등)는 그 날만 skip — 게이트 전체를 중단하지 않는다.
      console.warn(`  [${ticker}] ${date} 분봉 페치 실패 — skip: ${(e as Error).message}`);
    }
  }
  const seen = new Set<string>();
  const oneMin = acc
    .filter((c) => (seen.has(c.date) ? false : (seen.add(c.date), true)))
    .sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(file, JSON.stringify(oneMin));
  return oneMin;
}

type M = import("@/lib/types/signal").BacktestMetrics;
const fmt = (label: string, m: M) =>
  `${label.padEnd(7)} 표본 ${String(m.trades).padStart(4)} | 적중 ${(m.hitRate * 100).toFixed(1)}% | 손익비 ${m.profitFactor.toFixed(2)} | 평균 ${m.avgReturnPct.toFixed(2)}%`;
const passGate = (m: M) =>
  m.profitFactor > 1.3 && m.hitRate > 0.45 && m.avgReturnPct > 0 && m.trades >= 100;

describe.skipIf(!ENABLED)("분봉 검증 게이트 (bake-off)", () => {
  beforeAll(() => {
    loadEnvLocal();
    if (!existsSync(FIXTURE_DIR)) mkdirSync(FIXTURE_DIR, { recursive: true });
  });

  it(
    "3/5/15분 net-of-cost 엣지 측정 → N 선택",
    { timeout: 1_800_000 },
    async () => {
      const { backtest } = await import("@/lib/signal/backtest/run");
      const { computeMetrics } = await import("@/lib/signal/backtest/metrics");
      const { resampleMinuteCandles } = await import("@/lib/api/kis/minuteChartChunked");
      const { resolveIntradayProfile, evaluateIntradaySignal } = await import("@/lib/signal/intradayProfile");
      await ensureToken();

      type T = import("@/lib/types/signal").BacktestTrade;
      const pooled: Record<number, T[]> = { 3: [], 5: [], 15: [] };
      const passCount: Record<number, number> = { 3: 0, 5: 0, 15: 0 };

      for (const ticker of TICKERS) {
        const oneMin = await loadOneMinFixture(ticker);
        const lines: string[] = [];

        for (const tf of TIMEFRAMES) {
          const profile = resolveIntradayProfile(tf);
          const candles = resampleMinuteCandles(oneMin, tf);
          if (candles.length < profile.minBars + HORIZON_BARS[tf] + 5) {
            lines.push(`  ${tf}m: 봉 부족(${candles.length}) — skip`);
            continue;
          }

          const result = backtest(candles, {
            // 라이브와 같은 평가(graded 축 포함) — evaluate 훅 바인딩(PR-1b). dailyRegime 0 =
            // veto 없음(setup 순수 엣지 측정, 라이브는 일봉 레짐 veto 추가 — 기존 regimeFilter:false 등가).
            evaluate: (slice) => evaluateIntradaySignal(slice, tf, 0),
            barrier: {
              mode: "structure",
              horizonDays: HORIZON_BARS[tf], // 분봉에선 '봉' 단위 호라이즌
              lookbackBars: profile.structureLookback,
              maStopPeriod: 20,
              minRRR: 1.5,
            },
            entry: { mode: "trigger", cooldownDays: COOLDOWN_BARS },
            costPct: ROUND_TRIP_COST,
            warmupBars: profile.minBars,
          });
          pooled[tf].push(...result.trades);
          if (passGate(result.metrics)) passCount[tf] += 1;
          lines.push(`  ${fmt(`${tf}m`, result.metrics)} ${result.metrics.avgReturnPct > 0 ? "🟢" : "🔴"}`);
        }
        console.log(`\n[${ticker}] (봉 ${oneMin.length})\n${lines.join("\n")}`);
      }

      const report = TIMEFRAMES.map((tf) => {
        const m = computeMetrics(pooled[tf]);
        return `${fmt(`${tf}m`, m)} | 합격종목 ${passCount[tf]}/${TICKERS.length} | 풀게이트 ${passGate(m) ? "PASS" : "FAIL"}`;
      }).join("\n");
      console.log(`\n===== 풀링 bake-off (net@${ROUND_TRIP_COST}%, 트리거, regime off) =====\n${report}`);

      // 게이트는 리포트 산출이 목적(진행/중단은 사람이 판단). 데이터 확보만 강제.
      expect(pooled[5].length + pooled[3].length + pooled[15].length).toBeGreaterThan(0);
    },
  );
});
