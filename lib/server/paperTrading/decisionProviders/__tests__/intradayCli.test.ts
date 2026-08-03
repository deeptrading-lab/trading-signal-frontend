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
  deriveStructureEvent,
  deriveActionFromConviction,
  convictionEntryPositionPct,
  convictionToConfidence,
  normalizeLlm,
  intradayEffort,
  toPaperTradingDecision,
} from "../intradayCli";
import type { IntradayFeatureRead } from "@/lib/signal/intradayFeatures";
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
  it("약세 레짐(-1)이면 변화 없음이어도 LLM 호출 — 관측 창(진입은 사후 veto 가 막음)", () => {
    const c = ctx({
      signal: signal({ action: "HOLD", regime: -1 }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(true);
    // 중립·강세는 기존대로 스킵(비용 절감) — 관측 창은 약세 한정.
    for (const regime of [0, 1] as const) {
      const other = ctx({
        signal: signal({ action: "HOLD", regime }),
        previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
      });
      expect(evaluatePreGate(other, false).callLlm).toBe(false);
    }
  });
  it("약세 레짐이어도 신규 진입 불가(15:00+·일일손실·쿨다운)면 스킵 유지", () => {
    const c = ctx({
      nowHhmm: "15:05",
      signal: signal({ action: "HOLD", regime: -1 }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(false);
    const cooled = ctx({
      signal: signal({ action: "HOLD", regime: -1 }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
    });
    expect(evaluatePreGate(cooled, false, true).callLlm).toBe(false);
  });
  it("재진입 쿨다운 → noNewEntry (구조 이벤트 LLM 관통도 차단)", () => {
    expect(evaluatePreGate(ctx(), false, true).noNewEntry).toBe(true);
    const c = ctx({
      signal: signal({ action: "HOLD" }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
      structureEvent: "전고 돌파 진행",
    });
    expect(evaluatePreGate(c, false, true).callLlm).toBe(false);
  });
  it("PR-3b 교차 이벤트(VWAP 재탈환 등)도 스킵을 뚫는다 — 단, 쿨다운이면 관통 차단", () => {
    const c = ctx({
      signal: signal({ action: "HOLD" }),
      previousDecision: { action: "HOLD", targetPrice: null, stopPrice: null, invalidationPrice: null, rationale: "" },
      structureEvent: "VWAP 재탈환 · 거래량 급증(z≥2)",
    });
    expect(evaluatePreGate(c, false).callLlm).toBe(true);
    // 재진입 쿨다운은 evaluatePreGate 3번째 인자로 noNewEntry 에 합산 → pierce 차단.
    const cooled = evaluatePreGate(c, false, true);
    expect(cooled.noNewEntry).toBe(true);
    expect(cooled.callLlm).toBe(false);
  });
});

// ─── preGate 교차 트리거 파생 (PR-3b) ────────────────────────────────────────

/** IntradayFeatureRead 빌더 — 이벤트 플래그만 뒤집어 트리거 파생을 검증. */
function featuresStub(over: Partial<IntradayFeatureRead> = {}): IntradayFeatureRead {
  return {
    lastBars: [],
    swing: {
      lastSwingLow: null,
      lastSwingHigh: null,
      prevSwingLow: null,
      prevSwingHigh: null,
      lowBroken: false,
      highBroken: false,
      sequence: "혼조",
    },
    fib: null,
    box: null,
    day: null,
    vwap: null,
    openingRange: null,
    momentum: { rsi: null, divergence: null, streak: 0 },
    vwapReclaim: false,
    orBreakout: false,
    volumeZSurge: false,
    ...over,
  };
}

describe("deriveStructureEvent (preGate 교차 트리거 확장, PR-3b)", () => {
  it("전고 돌파(기존 트리거) 라벨 유지", () => {
    const f = featuresStub({ swing: { ...featuresStub().swing, highBroken: true } });
    expect(deriveStructureEvent(f, 0)).toBe("전고 돌파 진행");
  });
  it("교차 이벤트 3종 각각 단독 라벨", () => {
    expect(deriveStructureEvent(featuresStub({ vwapReclaim: true }), 0)).toBe("VWAP 재탈환");
    expect(deriveStructureEvent(featuresStub({ orBreakout: true }), 1)).toBe(
      "오프닝 레인지 상단 돌파",
    );
    expect(deriveStructureEvent(featuresStub({ volumeZSurge: true }), 0)).toBe("거래량 급증(z≥2)");
  });
  it("복수 동시 성립 → ' · ' 결합(스냅샷·프롬프트에 전부 남김)", () => {
    const f = featuresStub({ vwapReclaim: true, volumeZSurge: true });
    expect(deriveStructureEvent(f, 0)).toBe("VWAP 재탈환 · 거래량 급증(z≥2)");
  });
  it("약세 레짐(-1)이면 이벤트가 있어도 null — 사후 게이트가 매수를 죽이므로 트리거 안 침", () => {
    const f = featuresStub({ vwapReclaim: true, orBreakout: true, volumeZSurge: true });
    expect(deriveStructureEvent(f, -1)).toBeNull();
  });
  it("이벤트 없음·피처 null → null(스킵 최적화 유지)", () => {
    expect(deriveStructureEvent(featuresStub(), 0)).toBeNull();
    expect(deriveStructureEvent(null, 0)).toBeNull();
  });
  it("안전 불변식 — 트리거는 폴백(deriveFromSignal)에 관여하지 않는다: HOLD 신호면 HOLD 유지", () => {
    const c = ctx({
      signal: signal({ action: "HOLD" }),
      structureEvent: "VWAP 재탈환 · 오프닝 레인지 상단 돌파",
    });
    expect(deriveFromSignal(c, false).action).toBe("HOLD");
  });
  it("안전 불변식 — 트리거로 LLM 이 BUY 를 내도 시장경보 사후 게이트가 그대로 강등(경보 우회 금지)", () => {
    const c = ctx({ structureEvent: "VWAP 재탈환", warnings: [warn("LIQUIDATION_TRADING")] });
    const { decision } = applyPostGate(buyLlm(), c, false);
    expect(decision.action).toBe("HOLD");
  });
});

// ─── 확신 점수 결정론 컷·사이징 (PR-3a, AC-10) ────────────────────────────────

describe("deriveActionFromConviction (결정론 컷)", () => {
  it("컷 경계 — 58(기본 컷)→BUY, 57→HOLD (AC-10)", () => {
    expect(deriveActionFromConviction(58, false)).toBe("BUY");
    expect(deriveActionFromConviction(57, false)).toBe("HOLD");
  });
  it("보유 중 — 40(기본 컷)→SELL, 41→HOLD", () => {
    expect(deriveActionFromConviction(40, true)).toBe("SELL");
    expect(deriveActionFromConviction(41, true)).toBe("HOLD");
  });
  it("무포지션 낮은 확신은 SELL 아님(공매도 없음) → HOLD", () => {
    expect(deriveActionFromConviction(10, false)).toBe("HOLD");
  });
  it("보유 중 높은 확신 → BUY(추가 매수)", () => {
    expect(deriveActionFromConviction(80, true)).toBe("BUY");
  });
});

describe("convictionEntryPositionPct (결정론 사이징)", () => {
  it("컷 기준점 58→20%, 80→64%, 95→80%(clamp)", () => {
    expect(convictionEntryPositionPct(58)).toBe(20);
    expect(convictionEntryPositionPct(80)).toBe(64); // 20+(80−58)×2
    expect(convictionEntryPositionPct(95)).toBe(80); // 20+(95−58)×2=94 → 80 캡
  });
  it("상한 clamp — 100점도 80% 캡", () => {
    expect(convictionEntryPositionPct(100)).toBe(80);
  });
  it("하한 clamp — 컷 미만 값이 와도 20% 바닥", () => {
    expect(convictionEntryPositionPct(50)).toBe(20);
  });
});

describe("convictionToConfidence (표시용 신뢰도 파생, AC-12)", () => {
  it("|Δ50| ≥ 25 → HIGH (75, 25)", () => {
    expect(convictionToConfidence(75)).toBe("HIGH");
    expect(convictionToConfidence(25)).toBe("HIGH");
  });
  it("|Δ50| ≥ 10 → MEDIUM (60, 40)", () => {
    expect(convictionToConfidence(60)).toBe("MEDIUM");
    expect(convictionToConfidence(40)).toBe("MEDIUM");
  });
  it("|Δ50| < 10 → LOW (55, 50)", () => {
    expect(convictionToConfidence(55)).toBe("LOW");
    expect(convictionToConfidence(50)).toBe("LOW");
  });
});

// ─── 듀얼 스키마 normalize (PR-3a) ────────────────────────────────────────────

describe("normalizeLlm — v2(convictionScore) / v1(레거시) 듀얼 스키마", () => {
  const v2 = (convictionScore: number, over: Record<string, unknown> = {}) => ({
    convictionScore,
    targetPrice: 10_400,
    stopPrice: 9_850,
    invalidationPrice: 9_850,
    expectedHoldingMinutes: 30,
    rationale: "점수 테스트.",
    riskNotes: ["유의"],
    ...over,
  });

  it("v2 무포지션 80점 → BUY 파생(사이징 64%·진입구간 현재가 근방·HIGH·마커)", () => {
    const r = normalizeLlm(v2(80), ctx());
    expect(r).toMatchObject({
      action: "BUY",
      confidence: "HIGH",
      entryPositionPct: 64,
      sellRatioPct: null,
      convictionScore: 80,
      judgeSchema: "v2",
    });
    // deriveFromSignal 과 동일한 진입 구간 파생(-0.1%~+0.2%).
    expect(r?.entryZone).toEqual({ low: 9_990, high: 10_020 });
    expect(r?.targetPrice).toBe(10_400);
  });

  it("v2 보유 중 30점 → SELL 전량(sellRatioPct=100) 파생", () => {
    const holding = ctx({
      position: { avgEntryPrice: 9_900, quantity: 10, unrealizedPnlPct: 1, heldMinutes: 20, allocationPct: 40 },
    });
    const r = normalizeLlm(v2(30), holding);
    expect(r).toMatchObject({ action: "SELL", sellRatioPct: 100, entryZone: null, entryPositionPct: null });
  });

  it("v2 55점 → HOLD(진입 필드 null·LOW)", () => {
    const r = normalizeLlm(v2(55), ctx());
    expect(r).toMatchObject({ action: "HOLD", confidence: "LOW", entryZone: null, entryPositionPct: null });
  });

  it("v2 범위 밖 점수는 0~100 clamp 후 파생(140→100→BUY·80% 캡)", () => {
    const r = normalizeLlm(v2(140), ctx());
    expect(r).toMatchObject({ action: "BUY", convictionScore: 100, entryPositionPct: 80 });
  });

  it("v1 레거시(action 직접) → 기존 파싱 유지 + 근사 확신 합성 + v1 마커", () => {
    const r = normalizeLlm(
      {
        action: "BUY",
        confidence: "HIGH",
        entryZone: { low: 9_990, high: 10_020 },
        entryPositionPct: 35,
        sellRatioPct: null,
        targetPrice: 10_400,
        stopPrice: 9_850,
        invalidationPrice: 9_850,
        expectedHoldingMinutes: 60,
        rationale: "레거시.",
        riskNotes: [],
      },
      ctx(),
    );
    expect(r).toMatchObject({
      action: "BUY",
      confidence: "HIGH", // v1 은 LLM confidence 그대로(파생 아님)
      entryPositionPct: 35,
      convictionScore: 70, // BUY→70 근사 합성
      judgeSchema: "v1",
    });
    expect(normalizeLlm({ action: "SELL", sellRatioPct: 50 }, ctx())?.convictionScore).toBe(30);
    expect(normalizeLlm({ action: "HOLD" }, ctx())?.convictionScore).toBe(50);
  });

  it("쓰레기 입력 → null (문자열·빈 객체·미정의 action)", () => {
    expect(normalizeLlm("그냥 텍스트", ctx())).toBeNull();
    expect(normalizeLlm(null, ctx())).toBeNull();
    expect(normalizeLlm({}, ctx())).toBeNull();
    expect(normalizeLlm({ action: "MAYBE" }, ctx())).toBeNull();
    expect(normalizeLlm({ convictionScore: "높음" }, ctx())).toBeNull(); // 숫자 아님 + action 없음
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

  // ── 재진입 쿨다운 (PR-3a) ──
  it("재진입 쿨다운이면 BUY → HOLD, generic 문구가 아닌 쿨다운 사유 기록", () => {
    const r = applyPostGate(buyLlm(), ctx(), true, true);
    expect(r.decision.action).toBe("HOLD");
    expect(r.adjustments.join()).toContain("재진입 쿨다운");
    expect(r.adjustments.join()).not.toContain("장 막판");
  });
  it("재진입 쿨다운은 SELL 에 영향 없음(보유 관리 유지)", () => {
    const r = applyPostGate(buyLlm({ action: "SELL" }), ctx(), true, true);
    expect(r.decision.action).toBe("SELL");
  });

  // ── 파생 BUY(v2 확신 컷) 위에서도 안전핀이 그대로 발화 (AC-12 호환) ──
  it("v2 파생 BUY 도 시장경보 강등이 발화한다", () => {
    const c = ctx({ warnings: [warn("LIQUIDATION_TRADING")] });
    const derived = normalizeLlm({ convictionScore: 80, targetPrice: 10_400, stopPrice: 9_850 }, c)!;
    expect(derived.action).toBe("BUY");
    const r = applyPostGate(derived, c, false);
    expect(r.decision.action).toBe("HOLD");
    expect(r.adjustments.join()).toContain("시장경보");
  });
  it("v2 파생 BUY 도 +5% 목표 캡이 발화한다", () => {
    const c = ctx({ price: 10_000, levels: levels({ tpPrice: 12_000, rrr: 3 }) });
    const derived = normalizeLlm({ convictionScore: 80, targetPrice: 11_000, stopPrice: 9_850 }, c)!;
    const r = applyPostGate(derived, c, false);
    expect(r.decision.action).toBe("BUY");
    expect(r.decision.targetPrice).toBe(10_500);
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

  it("정량 스냅샷 — 전달 시 저장 틱에 그대로 실린다(사후 미스 분석·A/B 근거)", () => {
    const snap = {
      basePrice: 10_000,
      signal: signal({ score: 35, action: "HOLD" as const, regime: 1 }),
      levels: levels({ rrr: 1.1, tpPct: 0.5, boxHigh: 10_050 }),
      structureEvent: "전고 돌파 진행",
    };
    const d = toPaperTradingDecision(intraday({ action: "HOLD" }), { ...base, position }, snap);
    expect(d.intradaySnapshot).toBe(snap);
    expect(d.intradaySnapshot?.levels.rrr).toBe(1.1);
    expect(d.intradaySnapshot?.signal.regime).toBe(1);
    expect(d.intradaySnapshot?.structureEvent).toBe("전고 돌파 진행");
  });

  it("정량 스냅샷 — 미전달(mock/구 경로)이면 미기록", () => {
    const d = toPaperTradingDecision(intraday({ action: "HOLD" }), { ...base, position });
    expect(d.intradaySnapshot).toBeUndefined();
  });

  it("확신 점수 영속 — convictionScore·judgeSchema 가 payload 에 실린다(에코·캘리브레이션 원장)", () => {
    const d = toPaperTradingDecision(
      intraday({ action: "HOLD", convictionScore: 58, judgeSchema: "v2" }),
      { ...base, position },
    );
    expect(d.convictionScore).toBe(58);
    expect(d.judgeSchema).toBe("v2");
  });

  it("확신 점수 — 폴백(미기록)이면 payload 키 자체가 없다(경량 유지)", () => {
    const d = toPaperTradingDecision(intraday({ action: "HOLD" }), { ...base, position });
    expect("convictionScore" in d).toBe(false);
    expect("judgeSchema" in d).toBe(false);
  });
});
