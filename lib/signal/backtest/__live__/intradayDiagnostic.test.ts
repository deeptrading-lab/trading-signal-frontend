/**
 * 분봉 게이트 진단 — **오프라인**(KIS 호출 없음). intradayBacktest 가 캐시한 1분봉 픽스처를 읽어
 * 변수 스윕(비용·레짐·진입모드·배리어) + 룰 attribution 을 돌려 "왜 음의 기대값인지"를 진단한다.
 *
 *   RUN_INTRADAY_DIAG=1 npx vitest run lib/signal/backtest/__live__/intradayDiagnostic.test.ts
 *
 * 픽스처가 없으면(__fixtures__/min/<ticker>_1m.json) intradayBacktest 를 먼저 1회 돌려 생성할 것.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { backtest, type BacktestOptions } from "@/lib/signal/backtest/run";
import { computeMetrics } from "@/lib/signal/backtest/metrics";
import { computeAttribution } from "@/lib/signal/backtest/attribution";
import { resampleMinuteCandles } from "@/lib/api/kis/minuteChartChunked";
import { resolveIntradayProfile } from "@/lib/signal/intradayProfile";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { BacktestTrade, BacktestMetrics } from "@/lib/types/signal";

const ENABLED = process.env.RUN_INTRADAY_DIAG === "1";

const TICKERS = (process.env.INTRADAY_TICKERS ?? "034020,006400,066570,329180")
  .split(",").map((t) => t.trim()).filter(Boolean);
const HORIZON_BARS: Record<number, number> = { 3: 40, 5: 24, 15: 16 };
const COOLDOWN_BARS = 3;
const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "min");

function loadFixture(ticker: string): StockMinuteCandle[] | null {
  const f = path.join(FIXTURE_DIR, `${ticker}_1m.json`);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as StockMinuteCandle[]) : null;
}

const fmt = (label: string, m: BacktestMetrics) =>
  `${label.padEnd(22)} 표본 ${String(m.trades).padStart(4)} | 적중 ${(m.hitRate * 100).toFixed(1)}% | PF ${m.profitFactor.toFixed(2)} | 평균 ${m.avgReturnPct.toFixed(3)}%`;

/** 종목별 backtest → trades 풀링. */
function pooledTrades(byTicker: Record<string, StockMinuteCandle[]>, tf: number, opts: BacktestOptions): BacktestTrade[] {
  const profile = resolveIntradayProfile(tf);
  const all: BacktestTrade[] = [];
  for (const ticker of TICKERS) {
    const oneMin = byTicker[ticker];
    if (!oneMin) continue;
    const candles = resampleMinuteCandles(oneMin, tf);
    if (candles.length < profile.minBars + HORIZON_BARS[tf] + 5) continue;
    all.push(...backtest(candles, { ...opts, warmupBars: profile.minBars }).trades);
  }
  return all;
}

function signalOpts(tf: number, regimeFilter: boolean): BacktestOptions["signal"] {
  const p = resolveIntradayProfile(tf);
  return { indicators: p.indicators, softMinBars: p.softMinBars, minBars: p.minBars, regimeFilter };
}
function structureBarrier(tf: number): BacktestOptions["barrier"] {
  return { mode: "structure", horizonDays: HORIZON_BARS[tf], lookbackBars: resolveIntradayProfile(tf).structureLookback, maStopPeriod: 20, minRRR: 1.5 };
}
function atrBarrier(tf: number): BacktestOptions["barrier"] {
  return { tpAtrMult: 3, slAtrMult: 1.5, horizonDays: HORIZON_BARS[tf] };
}

describe.skipIf(!ENABLED)("분봉 게이트 진단(오프라인 스윕)", () => {
  it("비용·레짐·진입·배리어 스윕 + attribution", { timeout: 120_000 }, () => {
    const byTicker: Record<string, StockMinuteCandle[]> = {};
    let loaded = 0;
    for (const t of TICKERS) {
      const f = loadFixture(t);
      if (f) { byTicker[t] = f; loaded += 1; }
    }
    console.log(`\n픽스처 로드: ${loaded}/${TICKERS.length} 종목 (${TICKERS.join(",")})`);
    expect(loaded).toBeGreaterThan(0);

    for (const tf of [3, 5, 15]) {
      const trigStruct = (cost: number, regime: boolean): BacktestOptions => ({
        signal: signalOpts(tf, regime), barrier: structureBarrier(tf),
        entry: { mode: "trigger", cooldownDays: COOLDOWN_BARS }, costPct: cost,
      });
      console.log(`\n========== ${tf}분봉 ==========`);
      // 1) 비용 민감도 — gross 엣지 존재?
      console.log(fmt("base gross(c0)", computeMetrics(pooledTrades(byTicker, tf, trigStruct(0, false)))));
      console.log(fmt("base net(c0.2)", computeMetrics(pooledTrades(byTicker, tf, trigStruct(0.2, false)))));
      console.log(fmt("base net(c0.4)", computeMetrics(pooledTrades(byTicker, tf, trigStruct(0.4, false)))));
      // 2) 레짐 veto ON (분봉 자체 레짐)
      console.log(fmt("regime ON(c0.4)", computeMetrics(pooledTrades(byTicker, tf, trigStruct(0.4, true)))));
      // 3) 진입모드 everyBar
      console.log(fmt("everyBar(c0.4)", computeMetrics(pooledTrades(byTicker, tf, {
        signal: signalOpts(tf, false), barrier: structureBarrier(tf), entry: { mode: "everyBar" }, costPct: 0.4,
      }))));
      // 4) 배리어 ATR(tp3/sl1.5)
      console.log(fmt("ATR barrier(c0.4)", computeMetrics(pooledTrades(byTicker, tf, {
        signal: signalOpts(tf, false), barrier: atrBarrier(tf), entry: { mode: "trigger", cooldownDays: COOLDOWN_BARS }, costPct: 0.4,
      }))));
      // 5) 롱/숏 분리 — gross 엣지가 방향 편향(down 샘플 숏)인지 확인. gross(c0)로 봐야 방향 효과가 보임.
      const base = pooledTrades(byTicker, tf, trigStruct(0, false));
      console.log(fmt("  └ LONG only(gross)", computeMetrics(base.filter((t) => t.action === "BUY"))));
      console.log(fmt("  └ SHORT only(gross)", computeMetrics(base.filter((t) => t.action === "SELL"))));
    }

    // 5) attribution — 5분 base(net0.4), 풀링. 룰별 예측력(적중률 오름차순=역예측 먼저).
    const attrTrades = pooledTrades(byTicker, 5, {
      signal: signalOpts(5, false), barrier: structureBarrier(5),
      entry: { mode: "trigger", cooldownDays: COOLDOWN_BARS }, costPct: 0.4,
    });
    console.log(`\n========== 5분 attribution (룰별 예측력, net@0.4%) ==========`);
    for (const a of computeAttribution(attrTrades)) {
      console.log(`  ${a.key.padEnd(22)} n=${String(a.count).padStart(4)} | 적중 ${(a.hitRate * 100).toFixed(1)}% | 평균 ${a.avgReturnPct.toFixed(3)}%`);
    }
  });
});
