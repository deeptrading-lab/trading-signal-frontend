/**
 * buildIntradayLevels ATR 폴백 테스트 (PRD intraday-decision-overhaul PR-1a, AC-5/AC-6).
 *
 * 구조 barrier 미확보 시 ATR 비대칭 폴백(TP 3×ATR / SL 1.5×ATR = 손익비 2.0)이 채워져
 * "RRR null 77% → 매수 자동 봉쇄" 갭이 해소되는지, 구조 존재 시엔 기존과 동일한지 검증.
 * structureBarrierAt 을 스텁해 두 분기를 결정론적으로 구동한다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type {
  IntradayContext,
  IntradayDecisionLlm,
} from "@/lib/types/intraday/intradayDecision";
import type { DecisionSignal } from "@/lib/types/stock/aiAnalysis";

vi.mock("@/lib/signal/levels/structureBarrier", () => ({
  structureBarrierAt: vi.fn(),
}));

import { buildIntradayLevels, applyPostGate } from "../intradayCli";
import { structureBarrierAt } from "@/lib/signal/levels/structureBarrier";

const mockBarrier = vi.mocked(structureBarrierAt);

/**
 * True Range 가 봉마다 정확히 `tr` 인 평탄 분봉 — ATR(14)==tr 로 폴백 기대값을 손으로 검산.
 * (high-low = tr, |high-prevClose| = |low-prevClose| = tr/2 → max = tr)
 */
function candles(n: number, close = 10_000, tr = 100): StockMinuteCandle[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-07-09T${String(9 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`,
    open: close,
    high: close + tr / 2,
    low: close - tr / 2,
    close,
    volume: 1_000,
  }));
}

beforeEach(() => {
  mockBarrier.mockReset();
});

describe("buildIntradayLevels — ATR 폴백 (PR-1a)", () => {
  it("AC-5: 구조 barrier null → ATR 폴백 TP/SL 채움(소스 atr, 손익비 정확히 2.0)", () => {
    mockBarrier.mockReturnValue(null);

    const lv = buildIntradayLevels(candles(30), 10_000, 5);

    // ATR = 100 → TP = 10,000 + 300, SL = 10,000 − 150.
    expect(lv.tpPrice).toBe(10_300);
    expect(lv.slPrice).toBe(9_850);
    expect(lv.tpSource).toBe("atr");
    expect(lv.slSource).toBe("atr");
    expect(lv.rrr).toBeCloseTo(2.0, 10);
    expect(lv.tpPct).toBeCloseTo(3, 10);
    expect(lv.slPct).toBeCloseTo(-1.5, 10);
  });

  it("AC-6: 구조 barrier 존재 → 폴백 미개입, 기존과 동일 통과", () => {
    mockBarrier.mockReturnValue({
      tpPrice: 10_400,
      slPrice: 9_850,
      tpSource: "hvn",
      slSource: "swing",
    });

    const lv = buildIntradayLevels(candles(30), 10_000, 5);

    expect(lv.tpPrice).toBe(10_400);
    expect(lv.slPrice).toBe(9_850);
    expect(lv.tpSource).toBe("hvn");
    expect(lv.slSource).toBe("swing");
    expect(lv.rrr).toBeCloseTo((10_400 - 10_000) / (10_000 - 9_850), 10);
  });

  it("봉 부족(ATR 워밍업 미달) → 폴백 불가, 기존처럼 null 유지(안전)", () => {
    mockBarrier.mockReturnValue(null);

    const lv = buildIntradayLevels(candles(10), 10_000, 5);

    expect(lv.tpPrice).toBeNull();
    expect(lv.slPrice).toBeNull();
    expect(lv.tpSource).toBeNull();
    expect(lv.rrr).toBeNull();
  });

  it("완전 평탄봉(ATR=0) → 폴백 미적용(0폭 TP/SL 방지)", () => {
    mockBarrier.mockReturnValue(null);

    const lv = buildIntradayLevels(candles(30, 10_000, 0), 10_000, 5);

    expect(lv.tpPrice).toBeNull();
    expect(lv.rrr).toBeNull();
  });

  it("MAX_TARGET_PCT 상호작용 — 큰 ATR 의 폴백 TP(+9%)도 사후 게이트가 +5% 캡", () => {
    mockBarrier.mockReturnValue(null);
    const lv = buildIntradayLevels(candles(30, 10_000, 300), 10_000, 5); // ATR=300 → TP 10,900
    expect(lv.tpPrice).toBe(10_900);
    expect(lv.rrr).toBeCloseTo(2.0, 10);

    const sig: DecisionSignal = {
      score: 65,
      action: "BUY",
      confidence: 0.7,
      regime: 0,
      asOf: "2026-07-09T10:00",
      axes: [],
    };
    const ctx: IntradayContext = {
      ticker: "005930",
      name: "삼성전자",
      asOf: "2026-07-09T10:00",
      price: 10_000,
      timeframe: 5,
      intervalMinutes: 5,
      signal: sig,
      levels: lv,
      recentBars: [],
      position: null,
      previousDecision: null,
      nowHhmm: "10:00",
    };
    const llm: IntradayDecisionLlm = {
      action: "BUY",
      confidence: "MEDIUM",
      entryZone: { low: 9_990, high: 10_020 },
      entryPositionPct: null,
      sellRatioPct: null,
      targetPrice: 10_900, // 폴백 TP 그대로 제시(+9%)
      stopPrice: 9_550,
      invalidationPrice: 9_550,
      expectedHoldingMinutes: 30,
      rationale: "테스트",
      riskNotes: [],
    };

    const { decision, adjustments } = applyPostGate(llm, ctx, false);

    expect(decision.action).toBe("BUY"); // rrr 2.0 ≥ 1.5 — 강등 없음
    expect(decision.targetPrice).toBe(10_500); // +5% 캡
    expect(adjustments.some((a) => a.includes("+5% 캡"))).toBe(true);
  });
});
