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

  it("저점 우상향 → HIGHER_LOW_BASE(+1) — lows 오버라이드로 스윙 저점 2회 확정, 마지막이 더 높음", () => {
    const n = 20;
    const closes = new Array(n).fill(100);
    // 스윙 저점 후보: index3=80, index13=90 (양쪽 STRUCTURE_SWING_WINDOW=3 이상 값으로 감싸 확정).
    const lows = [
      110, 108, 106, 80, 106, 108, 110,
      112, 114, 116, 114, 112, 110, 90,
      110, 112, 114, 116, 118, 116,
    ];
    const ctx = buildContext(makeCandles(closes, { lows }));
    const hits = evaluateTrend(ctx);
    const hit = hits.find((h) => h.key === "HIGHER_LOW_BASE");
    expect(hit).toBeDefined();
    expect(hit?.direction).toBe(1);
  });

  it("고점 우하향 → LOWER_HIGH_TOP(-1) — 스윙 고점 2회 확정, 마지막이 더 낮음", () => {
    const closes = [
      ...linearCloses(150, 5, 8), // 150..185 (고점1)
      ...linearCloses(180, -5, 6), // 180..155
      ...linearCloses(155, 2, 6), // 155..165 (고점2, 고점1보다 낮음)
      ...linearCloses(163, -5, 6), // 163..138
    ];
    const ctx = buildContext(makeCandles(closes));
    const hits = evaluateTrend(ctx);
    const hit = hits.find((h) => h.key === "LOWER_HIGH_TOP");
    expect(hit).toBeDefined();
    expect(hit?.direction).toBe(-1);
  });

  it("단조 상승만 하는 시퀀스 → 스윙 피벗이 2개 미만이라 신규 구조 반전 룰 미발화", () => {
    const ctx = buildContext(makeCandles(linearCloses(100, 1, 160)));
    const hits = evaluateTrend(ctx);
    expect(keys(hits)).not.toContain("HIGHER_LOW_BASE");
    expect(keys(hits)).not.toContain("LOWER_HIGH_TOP");
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

  it("MACD 히스토그램 수렴(음수→0 접근) → MACD_CONVERGE_UP(+1) 발화", () => {
    // 강한 상승 후 상승폭 둔화 — 히스토그램이 음수 상태에서 4봉 연속 |값| 축소.
    const convergeCloses = [...linearCloses(100, 2, 60), ...linearCloses(220, 0.3, 20)];
    const convergeCtx = buildContext(makeCandles(convergeCloses));
    const hist = convergeCtx.macd.map((p) => p.histogram);
    const i = convergeCtx.i;
    // 직접 계산해 방향(부호) 확인 — 마지막 값이 음수인지.
    expect(hist[i]).not.toBeNull();
    expect((hist[i] as number) < 0).toBe(true);

    const hits = evaluateMomentum(convergeCtx, 0);
    const hit = hits.find((h) => h.key === "MACD_CONVERGE_UP");
    expect(hit).toBeDefined();
    expect(hit?.direction).toBe(1);
    expect(hit?.detail).toMatch(/4봉 연속 축소/);
  });

  it("단조 선형 추세(변동폭 일정) → MACD 수렴 룰 미발화", () => {
    const flatCtx = buildContext(makeCandles(linearCloses(100, 1, 100)));
    const hits = evaluateMomentum(flatCtx, 0);
    expect(keys(hits)).not.toContain("MACD_CONVERGE_UP");
    expect(keys(hits)).not.toContain("MACD_CONVERGE_DOWN");
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
