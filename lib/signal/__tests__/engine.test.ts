import { describe, it, expect } from "vitest";
import { evaluateSignal } from "@/lib/signal/engine";
import { MIN_BARS } from "@/lib/signal/weights";
import { makeCandles, linearCloses, noisyCloses } from "./_fixtures";

describe("evaluateSignal", () => {
  it("워밍업 부족(<MIN_BARS) → HOLD 폴백 + warmupOk=false", () => {
    const r = evaluateSignal(makeCandles(linearCloses(100, 1, 50)));
    expect(r.warmupOk).toBe(false);
    expect(r.action).toBe("HOLD");
    expect(r.axes).toHaveLength(0);
  });

  it("빈 입력도 안전 — asOf 빈 문자열", () => {
    const r = evaluateSignal([]);
    expect(r.warmupOk).toBe(false);
    expect(r.asOf).toBe("");
  });

  it("강한 상승 추세 → BUY, 4축 점수 + asOf 채워짐", () => {
    const candles = makeCandles(noisyCloses(100, 1, MIN_BARS + 30));
    const r = evaluateSignal(candles);
    expect(r.warmupOk).toBe(true);
    expect(r.action).toBe("BUY");
    expect(r.score).toBeGreaterThan(60);
    expect(r.axes).toHaveLength(4);
    expect(r.asOf).toBe(candles[candles.length - 1].date);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("강한 하락 추세 → SELL", () => {
    const r = evaluateSignal(makeCandles(noisyCloses(400, -1, MIN_BARS + 30)));
    expect(r.action).toBe("SELL");
    expect(r.score).toBeLessThan(40);
  });

  it("축별 근거(hits)가 분해되어 노출된다", () => {
    const r = evaluateSignal(makeCandles(noisyCloses(100, 1, MIN_BARS + 30)));
    const trend = r.axes.find((a) => a.axis === "trend");
    expect(trend).toBeDefined();
    expect(trend!.hits.length).toBeGreaterThan(0);
    expect(trend!.hits.every((h) => typeof h.key === "string")).toBe(true);
  });
});
