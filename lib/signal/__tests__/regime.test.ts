import { describe, it, expect } from "vitest";
import { evaluateSignal } from "@/lib/signal/engine";
import { buildContext } from "@/lib/signal/context";
import { computeRegime } from "@/lib/signal/regime";
import { MIN_BARS } from "@/lib/signal/weights";
import { makeCandles, noisyCloses } from "./_fixtures";

describe("computeRegime", () => {
  it("상승 추세 → +1 (120선 우상향 + 가격 위)", () => {
    expect(computeRegime(buildContext(makeCandles(noisyCloses(100, 1, MIN_BARS + 30))))).toBe(1);
  });

  it("하락 추세 → -1 (120선 우하향 + 가격 아래)", () => {
    expect(computeRegime(buildContext(makeCandles(noisyCloses(400, -1, MIN_BARS + 30))))).toBe(-1);
  });

  it("SMA120 룩백 미확보 → 0 (필터 미적용)", () => {
    // base SMA(120) + 룩백(20) 미만 → prev null.
    expect(computeRegime(buildContext(makeCandles(noisyCloses(100, 1, 125))))).toBe(0);
  });
});

describe("레짐 필터 veto (engine)", () => {
  // 하락 추세(regime -1)에서 buyThreshold=0 으로 강제 BUY → 필터가 HOLD 로 veto.
  const down = makeCandles(noisyCloses(400, -1, MIN_BARS + 30));

  it("필터 off → 역추세 BUY 그대로", () => {
    const r = evaluateSignal(down, { buyThreshold: 0, regimeFilter: false });
    expect(r.action).toBe("BUY");
    expect(r.regime).toBe(-1); // 레짐은 항상 산출
  });

  it("필터 on(기본) → 약세 레짐에서 BUY veto → HOLD", () => {
    const r = evaluateSignal(down, { buyThreshold: 0 });
    expect(r.regime).toBe(-1);
    expect(r.action).toBe("HOLD");
  });

  it("워밍업 부족 시 regime=0", () => {
    expect(evaluateSignal(makeCandles(noisyCloses(100, 1, 50))).regime).toBe(0);
  });
});
