import { describe, expect, it } from "vitest";
import {
  applyMomentumTargetPolicy,
  intradayMomentumStopPrice,
  intradayMomentumTargetPrice,
} from "@/lib/server/paperTrading/intradayMomentumTarget";
import type { IntradayDecisionLlm } from "@/lib/types/intraday/intradayDecision";

function decision(over: Partial<IntradayDecisionLlm> = {}): IntradayDecisionLlm {
  return {
    action: "HOLD",
    confidence: "MEDIUM",
    entryZone: null,
    targetPrice: 10_050,
    stopPrice: 9_500,
    invalidationPrice: 9_500,
    expectedHoldingMinutes: 60,
    entryPositionPct: null,
    sellRatioPct: null,
    rationale: "기존 판단",
    riskNotes: [],
    convictionScore: 40,
    ...over,
  };
}

describe("오토파일럿 모멘텀 목표형", () => {
  it("실제 평단 기준 +2%/-1%를 KRX 호가 단위로 고정", () => {
    expect(intradayMomentumTargetPrice(10_000)).toBe(10_200);
    expect(intradayMomentumStopPrice(10_000)).toBe(9_900);

    const result = applyMomentumTargetPolicy({
      decision: decision(),
      signal: { action: "HOLD" },
      strategyMode: "momentum-target",
      referencePrice: 10_100,
      position: { avgEntryPrice: 10_000, quantity: 10 },
      maxPositionPct: 50,
    });
    expect(result.decision.targetPrice).toBe(10_200);
    expect(result.decision.stopPrice).toBe(9_900);
    expect(result.decision.invalidationPrice).toBe(9_900);
  });

  it("BUY는 확신 컷 시작 비중 대신 세션 최대 비중을 사용", () => {
    const result = applyMomentumTargetPolicy({
      decision: decision({ action: "BUY", entryPositionPct: 20 }),
      signal: { action: "BUY" },
      strategyMode: "momentum-target",
      referencePrice: 10_000,
      position: null,
      maxPositionPct: 50,
    });
    expect(result.decision.entryPositionPct).toBe(50);
    expect(result.decision.targetPrice).toBe(10_200);
    expect(result.decision.stopPrice).toBe(9_900);
  });

  it("무포지션 HOLD에는 가짜 목표·손절을 만들지 않음", () => {
    const result = applyMomentumTargetPolicy({
      decision: decision({ targetPrice: null, stopPrice: null, invalidationPrice: null }),
      signal: { action: "HOLD" },
      strategyMode: "momentum-target",
      referencePrice: 10_000,
      position: null,
      maxPositionPct: 50,
    });
    expect(result.decision.targetPrice).toBeNull();
    expect(result.decision.stopPrice).toBeNull();
  });

  it("일반 SELL 컷은 목표 전 HOLD, 강한 AI 훼손 또는 시그널 SELL은 청산 허용", () => {
    const common = {
      strategyMode: "momentum-target" as const,
      referencePrice: 10_050,
      position: { avgEntryPrice: 10_000, quantity: 10 },
      maxPositionPct: 50,
    };
    const ordinary = applyMomentumTargetPolicy({
      ...common,
      decision: decision({ action: "SELL", sellRatioPct: 100, convictionScore: 40 }),
      signal: { action: "HOLD" },
    });
    expect(ordinary.decision.action).toBe("HOLD");
    expect(ordinary.adjustments.join(" ")).toContain("조기청산 보류");

    const severe = applyMomentumTargetPolicy({
      ...common,
      decision: decision({ action: "SELL", sellRatioPct: 100, convictionScore: 20 }),
      signal: { action: "HOLD" },
    });
    expect(severe.decision.action).toBe("SELL");

    const deterministic = applyMomentumTargetPolicy({
      ...common,
      decision: decision({ action: "SELL", sellRatioPct: 100, convictionScore: 40 }),
      signal: { action: "SELL" },
    });
    expect(deterministic.decision.action).toBe("SELL");
  });

  it("수동 적응형 전략은 입력을 변경하지 않음", () => {
    const original = decision();
    const result = applyMomentumTargetPolicy({
      decision: original,
      signal: { action: "HOLD" },
      strategyMode: "adaptive",
      referencePrice: 10_000,
      position: { avgEntryPrice: 10_000, quantity: 10 },
      maxPositionPct: 50,
    });
    expect(result.decision).toBe(original);
    expect(result.adjustments).toEqual([]);
  });
});
