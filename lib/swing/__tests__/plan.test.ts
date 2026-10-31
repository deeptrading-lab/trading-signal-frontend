import { describe, it, expect } from "vitest";
import { makeCandles, linearCloses } from "@/lib/signal/__tests__/_fixtures";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import { buildPlan, simulatePlan } from "../plan";
import type { DoubleBottom } from "../patterns";
import { RULEBOOK, type Rulebook } from "../rulebook";
import { flatCloses } from "./_swingFixtures";

const rb = RULEBOOK;
const bar = (open: number, high: number, low: number, close: number, i = 0): StockDailyCandle => ({
  date: `2025-02-${String(i + 1).padStart(2, "0")}`,
  open,
  high,
  low,
  close,
  volume: 1000,
});
const quiet = (n: number, from = 0) => Array.from({ length: n }, (_, j) => bar(10_000, 10_100, 9_900, 10_000, from + j));
const plan = { stop: 9_500, target: 10_600 };

describe("simulatePlan", () => {
  it("t+1 시가가 손절 이하/목표 이상이면 진입하지 않는다(invalid)", () => {
    expect(simulatePlan([bar(9_400, 9_600, 9_300, 9_500), ...quiet(9, 1)], plan, 10, 0.28)).toEqual({
      status: "invalid",
      reason: "gap_below_stop",
    });
    expect(simulatePlan([bar(10_700, 10_800, 10_650, 10_700), ...quiet(9, 1)], plan, 10, 0.28)).toEqual({
      status: "invalid",
      reason: "gap_above_target",
    });
  });

  it("목표 터치 — 목표가에 익절, 비용 차감", () => {
    const next = [bar(10_000, 10_100, 9_900, 10_050, 0), bar(10_050, 10_200, 9_950, 10_150, 1), bar(10_150, 10_650, 10_100, 10_500, 2), ...quiet(7, 3)];
    const r = simulatePlan(next, plan, 10, 0.28);
    expect(r).toMatchObject({ status: "entered", entry: 10_000, exit: 10_600, exitReason: "target", daysHeld: 3 });
    if (r?.status === "entered") expect(r.netReturn).toBeCloseTo(0.06 - 0.0028, 10);
  });

  it("한 봉에서 손절·목표 모두 닿으면 손절", () => {
    const next = [bar(10_000, 10_700, 9_400, 10_000, 0), ...quiet(9, 1)];
    expect(simulatePlan(next, plan, 10, 0.28)).toMatchObject({ exitReason: "stop", exit: 9_500, daysHeld: 1 });
  });

  it("둘째 날부터 갭으로 손절선 아래 시가 → 시가에 손절(유리하게 가정 안 함)", () => {
    const next = [bar(10_000, 10_100, 9_900, 10_000, 0), bar(9_300, 9_400, 9_200, 9_350, 1), ...quiet(8, 2)];
    expect(simulatePlan(next, plan, 10, 0.28)).toMatchObject({ exitReason: "stop", exit: 9_300, daysHeld: 2 });
  });

  it("끝까지 안 닿으면 마지막 봉 종가 청산 · 봉이 모자라면 null", () => {
    expect(simulatePlan(quiet(10), plan, 10, 0.28)).toMatchObject({ exitReason: "time", exit: 10_000, daysHeld: 10 });
    expect(simulatePlan(quiet(9), plan, 10, 0.28)).toBeNull();
  });
});

describe("buildPlan", () => {
  it("쌍바닥 지지 — 저점 − 0.5 ATR, 호가 단위", () => {
    const w = makeCandles(flatCloses(9_200, 300), { wick: 10 });
    const db: DoubleBottom = { i1: 250, i2: 292, l1: 9_000, l2: 9_020, neckline: 9_500, divergence: true, breakout: false };
    const p = buildPlan(w, 100, db, rb)!;
    expect(p.stopSource).toBe("doubleBottom");
    expect(p.support).toBe(9_000);
    expect(p.stop).toBe(8_950);
    expect(p.entryRef).toBe(w[299].close);
  });

  it("지지가 너무 가까우면 손절폭을 1 ATR 로 넓힌다", () => {
    const w = makeCandles(flatCloses(9_200, 300, 0), { wick: 10 });
    const db: DoubleBottom = { i1: 250, i2: 292, l1: 9_180, l2: 9_180, neckline: 9_500, divergence: true, breakout: false };
    const p = buildPlan(w, 100, db, rb)!;
    expect(p.stopSource).toBe("doubleBottom");
    expect(p.stop).toBe(9_100);
  });

  it("지지가 3 ATR 보다 멀면 ATR 폴백(기준가 − 2 ATR)", () => {
    const w = makeCandles(flatCloses(9_200, 300, 0), { wick: 10 });
    const db: DoubleBottom = { i1: 250, i2: 292, l1: 8_500, l2: 8_520, neckline: 9_500, divergence: true, breakout: false };
    const p = buildPlan(w, 100, db, rb)!;
    expect(p.stopSource).toBe("atr");
    expect(p.stop).toBe(9_000);
  });

  it("두꺼운 매물대가 없으면(꾸준한 하락) 지지 없음 → ATR 폴백, 목표 = 상한", () => {
    const w = makeCandles(linearCloses(12_000, -10, 300), { wick: 10 });
    const p = buildPlan(w, 50, null, rb)!;
    expect(p.support).toBeNull();
    expect(p.stopSource).toBe("atr");
    expect(p.targetSource).toBe("cap");
    expect(p.stop).toBeLessThan(p.entryRef);
    expect(p.target).toBeGreaterThan(p.entryRef);
  });

  it("위쪽 두꺼운 매물대가 상한 안이면 목표 = 매물대 하단", () => {
    const closes = [...flatCloses(10_000, 150, 15), ...flatCloses(9_500, 150, 15)];
    const volumes = [...new Array(150).fill(1_000_000), ...new Array(150).fill(10_000)];
    const w = makeCandles(closes, { wick: 10, volumes });
    const wide: Rulebook = { ...rb, plan: { ...rb.plan, targetCapTypicalMult: 100 } };
    const p = buildPlan(w, 50, null, wide)!;
    expect(p.targetSource).toBe("zone");
    expect(p.resistance).not.toBeNull();
    expect(p.target).toBeGreaterThan(9_900);
    expect(p.target).toBeLessThan(10_000);
  });

  it("ATR 이 없으면 null", () => {
    expect(buildPlan(makeCandles(flatCloses(9_200, 300)), null, null, rb)).toBeNull();
  });
});
