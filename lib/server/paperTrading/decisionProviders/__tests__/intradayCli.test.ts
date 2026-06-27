/**
 * 단타 provider 룰 게이트 단위 테스트 (intraday-scalping-agent §3-4, AC-6).
 *
 * 환각 진입·과욕·역추세·손실확대 차단이 핵심 안전장치 — CLI 없이 순수 함수로 검증.
 */

import { describe, it, expect } from "vitest";
import {
  evaluatePreGate,
  applyPostGate,
  deriveFromSignal,
} from "../intradayCli";
import type {
  IntradayContext,
  IntradayDecisionLlm,
  IntradayLevels,
} from "@/lib/types/intraday/intradayDecision";
import type { DecisionSignal } from "@/lib/types/stock/aiAnalysis";

function signal(over: Partial<DecisionSignal> = {}): DecisionSignal {
  return {
    score: 65,
    action: "BUY",
    confidence: 0.7,
    regime: 0,
    asOf: "2026-06-28T10:00",
    axes: [],
    ...over,
  };
}

function levels(over: Partial<IntradayLevels> = {}): IntradayLevels {
  return {
    lastClose: 10_000,
    boxHigh: 10_300,
    boxLow: 9_800,
    tpPrice: 10_400,
    slPrice: 9_850,
    tpSource: "hvn",
    slSource: "swing",
    rrr: 2.0,
    tpPct: 4,
    slPct: -1.5,
    ...over,
  };
}

function ctx(over: Partial<IntradayContext> = {}): IntradayContext {
  return {
    ticker: "005930",
    name: "삼성전자",
    asOf: "2026-06-28T10:00",
    price: 10_000,
    timeframe: 5,
    signal: signal(),
    levels: levels(),
    recentBars: [],
    position: null,
    previousDecision: null,
    nowHhmm: "10:00",
    ...over,
  };
}

function buyLlm(over: Partial<IntradayDecisionLlm> = {}): IntradayDecisionLlm {
  return {
    action: "BUY",
    confidence: "MEDIUM",
    entryZone: { low: 9_990, high: 10_020 },
    targetPrice: 10_400,
    stopPrice: 9_850,
    invalidationPrice: 9_850,
    expectedHoldingMinutes: 60,
    rationale: "박스 상단 돌파 시도.",
    riskNotes: [],
    ...over,
  };
}

describe("evaluatePreGate", () => {
  it("15:00 이후 → noNewEntry", () => {
    expect(evaluatePreGate(ctx({ nowHhmm: "15:05" }), false).noNewEntry).toBe(true);
  });
  it("일일손실 kill → noNewEntry", () => {
    expect(evaluatePreGate(ctx({ nowHhmm: "10:00" }), true).noNewEntry).toBe(true);
  });
  it("무포지션 + HOLD + 직전 HOLD → LLM 스킵", () => {
    const c = ctx({
      signal: signal({ action: "HOLD" }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(false);
  });
  it("포지션 보유 시 → LLM 호출", () => {
    const c = ctx({
      position: { avgEntryPrice: 9_900, quantity: 10, unrealizedPnlPct: 1, heldMinutes: 20 },
      signal: signal({ action: "HOLD" }),
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(true);
  });
});

describe("applyPostGate", () => {
  it("noNewEntry 면 BUY → HOLD 강등", () => {
    const r = applyPostGate(buyLlm(), ctx(), true);
    expect(r.decision.action).toBe("HOLD");
    expect(r.decision.entryZone).toBeNull();
  });
  it("약세 레짐이면 BUY → HOLD veto", () => {
    const r = applyPostGate(buyLlm(), ctx({ signal: signal({ regime: -1 }) }), false);
    expect(r.decision.action).toBe("HOLD");
  });
  it("RRR<1.5 면 BUY → HOLD", () => {
    const r = applyPostGate(buyLlm(), ctx({ levels: levels({ rrr: 1.1 }) }), false);
    expect(r.decision.action).toBe("HOLD");
  });
  it("목표가가 구조 TP 위면 TP 로 제한", () => {
    const r = applyPostGate(buyLlm({ targetPrice: 11_000 }), ctx({ levels: levels({ tpPrice: 10_400 }) }), false);
    expect(r.decision.targetPrice).toBe(10_400);
  });
  it("손절가가 구조 SL 아래면 SL 로 제한(손실 확대 차단)", () => {
    const r = applyPostGate(buyLlm({ stopPrice: 9_500 }), ctx({ levels: levels({ slPrice: 9_850 }) }), false);
    expect(r.decision.stopPrice).toBe(9_850);
  });
  it("목표가 +5% 초과 시 캡", () => {
    // tpPrice 를 높게 둬 TP-clamp 를 통과시키고 +5% 캡만 테스트.
    const r = applyPostGate(
      buyLlm({ targetPrice: 11_000 }),
      ctx({ price: 10_000, levels: levels({ tpPrice: 12_000, rrr: 3 }) }),
      false,
    );
    expect(r.decision.targetPrice).toBe(10_500); // 10000 * 1.05
  });
  it("SELL 은 noNewEntry 와 무관하게 유지", () => {
    const r = applyPostGate(buyLlm({ action: "SELL" }), ctx(), true);
    expect(r.decision.action).toBe("SELL");
  });
});

describe("deriveFromSignal (폴백)", () => {
  it("BUY 시그널 + RRR 충족 + 진입 가능 → BUY", () => {
    expect(deriveFromSignal(ctx(), false).action).toBe("BUY");
  });
  it("noNewEntry 면 BUY 폴백 차단 → HOLD", () => {
    expect(deriveFromSignal(ctx(), true).action).toBe("HOLD");
  });
  it("약세 레짐이면 BUY 폴백 차단 → HOLD", () => {
    expect(deriveFromSignal(ctx({ signal: signal({ regime: -1 }) }), false).action).toBe("HOLD");
  });
  it("포지션 보유 + SELL 시그널 → SELL", () => {
    const c = ctx({
      signal: signal({ action: "SELL" }),
      position: { avgEntryPrice: 9_900, quantity: 10, unrealizedPnlPct: -2, heldMinutes: 30 },
    });
    expect(deriveFromSignal(c, false).action).toBe("SELL");
  });
});
