import { describe, it, expect } from "vitest";
import { evaluateSignal } from "@/lib/signal/engine";
import { aggregateAxis, composite } from "@/lib/signal/score";
import { buildContext } from "@/lib/signal/context";
import { evaluateTrend } from "@/lib/signal/factors/trend";
import { evaluateMomentum } from "@/lib/signal/factors/momentum";
import { evaluateVolume } from "@/lib/signal/factors/volume";
import { evaluateVolatility } from "@/lib/signal/factors/volatility";
import type { AxisScore } from "@/lib/types/signal";
import { MIN_BARS, SOFT_MIN_BARS } from "@/lib/signal/weights";
import { makeCandles, linearCloses, noisyCloses } from "./_fixtures";

/** 엔진 내부와 동일한 순서로 축을 재계산 — 캡 전(raw) composite confidence 를 독립 산출(테스트 전용). */
function rawComposite(candles: ReturnType<typeof makeCandles>) {
  const ctx = buildContext(candles);
  const trendHits = evaluateTrend(ctx);
  const trendAxis = aggregateAxis("trend", trendHits);
  const axes: AxisScore[] = [
    trendAxis,
    aggregateAxis("momentum", evaluateMomentum(ctx, trendAxis.direction)),
    aggregateAxis("volume", evaluateVolume(ctx)),
    aggregateAxis("volatility", evaluateVolatility(ctx, trendAxis.direction)),
  ];
  return composite(axes);
}

describe("evaluateSignal", () => {
  it("워밍업 부족(<SOFT_MIN_BARS) → HOLD 폴백 + warmupOk=false", () => {
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

// ─── degraded warmup (90~130봉) — PRD signal-degraded-warmup ───────────────────
describe("evaluateSignal — degraded warmup 경계값 (AC-5)", () => {
  // 봉수 상수 가드 — 경계 규칙이 동결돼 있는지(off-by-one 방지) 확인.
  it("상수 — SOFT_MIN_BARS=90, MIN_BARS=130", () => {
    expect(SOFT_MIN_BARS).toBe(90);
    expect(MIN_BARS).toBe(130);
  });

  it("n=89 (<90) → 하드 폴백: warmupOk=false, axes 비움, bars=89, limitedData=false (AC-1)", () => {
    const r = evaluateSignal(makeCandles(noisyCloses(100, 1, SOFT_MIN_BARS - 1)));
    expect(r.warmupOk).toBe(false);
    expect(r.action).toBe("HOLD");
    expect(r.axes).toHaveLength(0);
    expect(r.bars).toBe(SOFT_MIN_BARS - 1);
    expect(r.limitedData).toBe(false);
    expect(r.confidence).toBe(0);
  });

  it.each([SOFT_MIN_BARS, 119, MIN_BARS - 1])(
    "n=%i (90≤n<130) → limitedData=true, warmupOk=true, verdict 산출, bars=n (AC-2 a·b)",
    (n) => {
      const candles = makeCandles(noisyCloses(100, 1, n));
      const r = evaluateSignal(candles);
      expect(r.warmupOk).toBe(true);
      expect(r.limitedData).toBe(true);
      expect(r.bars).toBe(n);
      expect(r.axes).toHaveLength(4);
      expect(["BUY", "HOLD", "SELL"]).toContain(r.action);
      expect(r.asOf).toBe(candles[candles.length - 1].date);
    },
  );

  it.each([MIN_BARS, MIN_BARS + 30, MIN_BARS + 100])(
    "n=%i (≥130) → limitedData=false (풀 품질), warmupOk=true, bars=n (AC-3)",
    (n) => {
      const r = evaluateSignal(makeCandles(noisyCloses(100, 1, n)));
      expect(r.warmupOk).toBe(true);
      expect(r.limitedData).toBe(false);
      expect(r.bars).toBe(n);
      expect(r.axes).toHaveLength(4);
    },
  );

  it("confidence 캡 — limitedData(90~130) 시 numeric confidence ≤ 0.6 (AC-2 e)", () => {
    for (const n of [SOFT_MIN_BARS, 110, MIN_BARS - 1]) {
      const r = evaluateSignal(makeCandles(noisyCloses(100, 1, n)));
      expect(r.limitedData).toBe(true);
      expect(r.confidence).toBeLessThanOrEqual(0.6);
    }
  });

  it("confidence 캡 — limitedData 결과 = min(raw composite, 0.6) (캡 의미 가드, AC-2 e)", () => {
    // 캡이 결정적으로 적용됨을 raw composite 와 직접 대조해 증명(특정 fixture 의 값에 의존하지 않음).
    for (const n of [SOFT_MIN_BARS, 110, MIN_BARS - 1]) {
      const candles = makeCandles(noisyCloses(100, 1, n));
      const r = evaluateSignal(candles);
      const raw = rawComposite(candles).confidence;
      expect(r.confidence).toBeCloseTo(Math.min(raw, 0.6), 10);
    }
  });

  it("n≥130 회귀 — confidence 무캡: 풀 데이터는 raw composite 와 동일 (AC-3)", () => {
    // limitedData 분기가 풀 데이터 경로로 새 numeric confidence 를 건드리지 않음을 가드.
    for (const n of [MIN_BARS, MIN_BARS + 30, MIN_BARS + 100]) {
      const candles = makeCandles(noisyCloses(100, 1, n));
      const r = evaluateSignal(candles);
      expect(r.limitedData).toBe(false);
      expect(r.confidence).toBeCloseTo(rawComposite(candles).confidence, 10);
    }
  });

  it("n≥130 회귀 — 순수성: 동일 입력 동일 출력 (AC-3·AC-4)", () => {
    const candles = makeCandles(noisyCloses(100, 1, MIN_BARS + 30));
    const a = evaluateSignal(candles);
    const b = evaluateSignal(candles);
    expect(a).toEqual(b);
    expect(a.limitedData).toBe(false);
  });

  it("순수성 (AC-4) — limitedData 구간도 동일 입력 → 동일 출력(부작용 없음)", () => {
    const candles = makeCandles(noisyCloses(100, 1, 100));
    const a = evaluateSignal(candles);
    const b = evaluateSignal([...candles]);
    expect(a).toEqual(b);
    expect(a.limitedData).toBe(true);
  });
});
