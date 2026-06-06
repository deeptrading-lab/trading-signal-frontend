import { describe, it, expect } from "vitest";
import { buildContext } from "@/lib/signal/context";
import { evaluateTrend } from "@/lib/signal/factors/trend";
import { evaluateMomentum } from "@/lib/signal/factors/momentum";
import { evaluateVolume } from "@/lib/signal/factors/volume";
import { evaluateVolatility } from "@/lib/signal/factors/volatility";
import { REGIME_DAMPEN, RULE_WEIGHTS } from "@/lib/signal/weights";
import { makeCandles, linearCloses } from "./_fixtures";

const keys = (hits: { key: string }[]) => hits.map((h) => h.key);

describe("evaluateTrend", () => {
  it("강한 상승 추세 → 정배열 + 현재가 이평 위", () => {
    const ctx = buildContext(makeCandles(linearCloses(100, 1, 160)));
    const hits = evaluateTrend(ctx);
    expect(keys(hits)).toContain("MA_ALIGNED_BULL");
    expect(keys(hits)).toContain("PRICE_ABOVE_MAS");
    expect(hits.every((h) => h.direction >= 0)).toBe(true);
  });

  it("강한 하락 추세 → 역배열 + 현재가 이평 아래", () => {
    const ctx = buildContext(makeCandles(linearCloses(300, -1, 160)));
    const hits = evaluateTrend(ctx);
    expect(keys(hits)).toContain("MA_ALIGNED_BEAR");
    expect(keys(hits)).toContain("PRICE_BELOW_MAS");
  });
});

describe("evaluateMomentum 레짐 게이트", () => {
  // 상승 후 막판 급락 → RSI 과매도.
  const closes = [...linearCloses(100, 0.2, 150), 100, 95, 90, 85, 80, 75, 70, 65, 60, 55];
  const ctx = buildContext(makeCandles(closes));

  it("RSI 과매도 신호가 발화", () => {
    const hits = evaluateMomentum(ctx, 0);
    expect(keys(hits)).toContain("RSI_OVERSOLD");
  });

  it("추세가 하락(-1)이면 매수성 신호 가중이 감쇠된다", () => {
    const neutral = evaluateMomentum(ctx, 0).find((h) => h.key === "RSI_OVERSOLD");
    const counter = evaluateMomentum(ctx, -1).find((h) => h.key === "RSI_OVERSOLD");
    expect(neutral?.weight).toBe(RULE_WEIGHTS.rsiExtreme);
    expect(counter?.weight).toBeCloseTo(RULE_WEIGHTS.rsiExtreme * REGIME_DAMPEN);
  });
});

describe("evaluateVolume", () => {
  it("상승 + 거래량 급증 → 동반 강세(+1)", () => {
    const volumes = [...new Array(29).fill(1000), 5000];
    const ctx = buildContext(makeCandles(linearCloses(100, 1, 30), { volumes }));
    const hits = evaluateVolume(ctx);
    const surge = hits.find((h) => h.key === "VOLUME_SURGE_UP");
    expect(surge).toBeDefined();
    expect(surge?.direction).toBe(1);
  });
});

describe("evaluateVolatility", () => {
  it("막판 급락으로 볼린저 하단 이탈 → 하단 터치(+1)", () => {
    const closes = [...new Array(24).fill(100), 80];
    const ctx = buildContext(makeCandles(closes));
    const hits = evaluateVolatility(ctx);
    const touch = hits.find((h) => h.key === "BOLL_LOWER_TOUCH");
    expect(touch).toBeDefined();
    expect(touch?.direction).toBe(1);
  });
});
