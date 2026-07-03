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
  intradayEffort,
  toPaperTradingDecision,
} from "../intradayCli";
import type {
  IntradayContext,
  IntradayDecisionLlm,
  IntradayLevels,
} from "@/lib/types/intraday/intradayDecision";
import type { DecisionSignal } from "@/lib/types/stock/aiAnalysis";
import type { StockWarningItem } from "@/lib/types/stock/warnings";

/** 활성 경보 1건 빌더(날짜는 실측처럼 null). */
function warn(warningType: string): StockWarningItem {
  return { warningType, exchange: null, startDate: null, endDate: null };
}

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
    intervalMinutes: 5,
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
    entryPositionPct: null,
    sellRatioPct: null,
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
      position: { avgEntryPrice: 9_900, quantity: 10, unrealizedPnlPct: 1, heldMinutes: 20, allocationPct: 50 },
      signal: signal({ action: "HOLD" }),
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(true);
  });
  it("무포지션 + HOLD 지속이어도 구조 이벤트(전고 돌파)면 LLM 호출", () => {
    const c = ctx({
      signal: signal({ action: "HOLD" }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
      structureEvent: "전고 돌파 진행",
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(true);
  });
  it("구조 이벤트여도 신규 진입 불가 시간(15:00+)이면 스킵 유지", () => {
    const c = ctx({
      nowHhmm: "15:05",
      signal: signal({ action: "HOLD" }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
      structureEvent: "전고 돌파 진행",
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(false);
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

  // ── 거래소 시장경보 게이트 (PRD intraday-warning-gate) ──
  it("정리매매 활성이면 BUY → HOLD 하드 강등 (AC-1)", () => {
    const r = applyPostGate(buyLlm(), ctx({ warnings: [warn("LIQUIDATION_TRADING")] }), false);
    expect(r.decision.action).toBe("HOLD");
    expect(r.adjustments.join()).toContain("시장경보");
  });
  it("투자위험 활성이면 BUY → HOLD 강등 (AC-2)", () => {
    const r = applyPostGate(buyLlm(), ctx({ warnings: [warn("INVESTMENT_RISK")] }), false);
    expect(r.decision.action).toBe("HOLD");
  });
  it("단기과열·투자경고·VI(warn/info)는 차단하지 않는다 (AC-4)", () => {
    for (const t of ["OVERHEATED", "INVESTMENT_WARNING", "VI_STATIC"]) {
      const r = applyPostGate(buyLlm(), ctx({ warnings: [warn(t)] }), false);
      expect(r.decision.action, `${t} 는 유지`).toBe("BUY");
    }
  });
  it("경보 활성 + SELL 은 영향 없음 (AC-6)", () => {
    const r = applyPostGate(buyLlm({ action: "SELL" }), ctx({ warnings: [warn("INVESTMENT_RISK")] }), false);
    expect(r.decision.action).toBe("SELL");
  });
});

describe("intradayEffort (effort 미지원 모델 가드)", () => {
  it("Haiku 4.5 는 effort 생략(미지원)", () => {
    expect(intradayEffort("claude-haiku-4-5")).toBeUndefined();
    expect(intradayEffort("claude-haiku-4-5-20251001")).toBeUndefined();
  });
  it("Sonnet 4.5 도 effort 생략(미지원)", () => {
    expect(intradayEffort("claude-sonnet-4-5")).toBeUndefined();
  });
  it("Sonnet 4.6 / Opus 는 'low'", () => {
    expect(intradayEffort("claude-sonnet-4-6")).toBe("low");
    expect(intradayEffort("claude-opus-4-8")).toBe("low");
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
      position: { avgEntryPrice: 9_900, quantity: 10, unrealizedPnlPct: -2, heldMinutes: 30, allocationPct: 50 },
    });
    expect(deriveFromSignal(c, false).action).toBe("SELL");
  });
  it("정리매매 활성이면 폴백도 BUY 차단 → HOLD (AC-3 — applyPostGate 우회 방지)", () => {
    expect(deriveFromSignal(ctx({ warnings: [warn("LIQUIDATION_TRADING")] }), false).action).toBe("HOLD");
  });
  it("단기과열만이면 폴백 BUY 유지 (AC-4)", () => {
    expect(deriveFromSignal(ctx({ warnings: [warn("OVERHEATED")] }), false).action).toBe("BUY");
  });
});

describe("toPaperTradingDecision (AI 분할 매수·분할 매도)", () => {
  const base = { ticker: "005930", name: "삼성전자", riskMode: "balanced" as const, maxPositionPct: 50 };
  const position = { avgEntryPrice: 9_900, quantity: 10, unrealizedPnlPct: 1, heldMinutes: 20, allocationPct: 40 };

  function intraday(over: Partial<IntradayDecisionLlm> = {}) {
    return {
      ...buyLlm(over),
      basePrice: 10_000,
      rrr: 2,
      signal: signal(),
      source: "intraday-cli" as const,
      gateAdjustments: [],
    };
  }

  it("BUY — AI 목표 비중을 maxPositionPct 로 캡", () => {
    const d = toPaperTradingDecision(intraday({ entryPositionPct: 80 }), { ...base, position: null });
    expect(d.action).toBe("BUY");
    expect(d.targetAllocationPct).toBe(50);
  });

  it("BUY — 보수적 분할 진입(작은 비중)은 그대로 반영", () => {
    const d = toPaperTradingDecision(intraday({ entryPositionPct: 25 }), { ...base, position: null });
    expect(d.targetAllocationPct).toBe(25);
  });

  it("BUY — 미지정이면 리스크모드 기본(균형=60→캡 50)", () => {
    const d = toPaperTradingDecision(intraday({ entryPositionPct: null }), { ...base, position: null });
    expect(d.targetAllocationPct).toBe(50);
  });

  it("BUY — 기존 비중보다 낮춰 잡지 않고, 여력이 없으면 주문도 내지 않는다(매도 역전 방지)", () => {
    const d = toPaperTradingDecision(intraday({ entryPositionPct: 20 }), { ...base, position });
    expect(d.targetAllocationPct).toBe(40);
    expect(d.targetAllocations).toHaveLength(0); // 목표=현 비중 → floor 드리프트 매도 차단.
  });

  it("SELL — 분할 청산 50% → REDUCE, 목표 비중 = 현 비중의 절반", () => {
    const d = toPaperTradingDecision(
      intraday({ action: "SELL", sellRatioPct: 50 }),
      { ...base, position },
    );
    expect(d.action).toBe("REDUCE");
    expect(d.targetAllocationPct).toBe(20);
  });

  it("SELL — 비율 미지정/100 이면 전량(EXIT)", () => {
    const d = toPaperTradingDecision(
      intraday({ action: "SELL", sellRatioPct: null }),
      { ...base, position },
    );
    expect(d.action).toBe("EXIT");
    expect(d.targetAllocationPct).toBe(0);
  });

  it("HOLD — 현재 비중 유지 + 주문 없음(stale 비중 되먹임 매도 누수 방지)", () => {
    const d = toPaperTradingDecision(intraday({ action: "HOLD" }), { ...base, position });
    expect(d.action).toBe("HOLD");
    expect(d.targetAllocationPct).toBe(40);
    expect(d.targetAllocations).toHaveLength(0);
  });
});
