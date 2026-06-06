import { describe, it, expect } from "vitest";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import { tripleBarrier } from "@/lib/signal/backtest/label";
import { backtest } from "@/lib/signal/backtest/run";
import { computeMetrics } from "@/lib/signal/backtest/metrics";
import { MIN_BARS } from "@/lib/signal/weights";
import { makeCandles, linearCloses } from "./_fixtures";

/** 라벨 테스트용 명시 OHLC 캔들. */
function bar(close: number, high: number, low: number): StockDailyCandle {
  return { date: "2020-01-01", open: close, high, low, close, volume: 1000 };
}

describe("tripleBarrier (tpPct/slPct 고정, horizon=10)", () => {
  const opts = { tpPct: 5, slPct: 5, horizonDays: 10 };
  const entry = bar(100, 100, 100);

  it("익절 먼저 닿으면 WIN (+5%)", () => {
    const candles = [entry, bar(104, 106, 99), bar(108, 109, 103)];
    const r = tripleBarrier(candles, 0, 1, opts);
    expect(r?.label).toBe("WIN");
    expect(r?.returnPct).toBeCloseTo(5);
  });

  it("손절 먼저 닿으면 LOSS (-5%)", () => {
    const candles = [entry, bar(96, 101, 94)];
    const r = tripleBarrier(candles, 0, 1, opts);
    expect(r?.label).toBe("LOSS");
    expect(r?.returnPct).toBeCloseTo(-5);
  });

  it("한 봉에 양쪽 닿으면 손절 우선(보수적)", () => {
    const candles = [entry, bar(100, 106, 94)];
    expect(tripleBarrier(candles, 0, 1, opts)?.label).toBe("LOSS");
  });

  it("기간 내 미도달 → NEUTRAL (종가 수익률)", () => {
    const candles = [entry, bar(102, 103, 99), bar(101, 103, 99)];
    const r = tripleBarrier(candles, 0, 1, opts);
    expect(r?.label).toBe("NEUTRAL");
    expect(r?.returnPct).toBeCloseTo(1); // (101-100)/100
  });

  it("SHORT 방향 — 하락이 익절", () => {
    const candles = [entry, bar(94, 101, 94)];
    const r = tripleBarrier(candles, 0, -1, opts);
    expect(r?.label).toBe("WIN");
    expect(r?.returnPct).toBeCloseTo(5);
  });

  it("미래 봉이 없으면 null(검증 불가)", () => {
    expect(tripleBarrier([entry], 0, 1, opts)).toBeNull();
  });
});

describe("backtest 워크포워드", () => {
  it("지속 상승장 → BUY 신호 다수, 적중률 1, 룩어헤드 가드(마지막 봉 진입 없음)", () => {
    const candles = makeCandles(linearCloses(100, 1, MIN_BARS + 60));
    const res = backtest(candles, { barrier: { tpPct: 3, slPct: 3, horizonDays: 20 } });

    expect(res.metrics.trades).toBeGreaterThan(0);
    expect(res.metrics.hitRate).toBe(1); // 매봉 +1 → 3봉 내 +3% 익절
    // 미래 봉 필요 → 마지막 봉에는 진입하지 않는다.
    const lastDate = candles[candles.length - 1].date;
    expect(res.trades.every((t) => t.date < lastDate)).toBe(true);
    // 규칙별 attribution 산출.
    expect(res.attribution.length).toBeGreaterThan(0);
  });
});

describe("computeMetrics", () => {
  it("손익비·MDD 산식", () => {
    const m = computeMetrics([
      { date: "d1", action: "BUY", score: 70, entryPrice: 100, label: "WIN", returnPct: 10, ruleKeys: [] },
      { date: "d2", action: "BUY", score: 70, entryPrice: 100, label: "LOSS", returnPct: -5, ruleKeys: [] },
    ]);
    expect(m.hitRate).toBeCloseTo(0.5);
    expect(m.profitFactor).toBeCloseTo(2); // 10 / 5
    expect(m.maxDrawdownPct).toBeCloseTo(5); // 고점 10 → 5 로 하락
  });
});
