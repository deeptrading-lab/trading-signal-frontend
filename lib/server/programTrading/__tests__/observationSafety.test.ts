import { describe, expect, it } from "vitest";
import type { Quote, TradingState } from "@/lib/types/programTrading/programTrading";
import { enforceObservationSafety, initialState, liquidation, PAPER_STOP_TIMEOUT_MS, RULES, settleExpiredPaperStop, step } from "../engine";

const now = Date.parse("2026-11-19T01:00:00Z");
function held(): TradingState {
  const state = initialState();
  state.executionMode = "toss-paper";
  state.running = true;
  state.lastStepAt = now;
  state.updatedAt = new Date(now).toISOString();
  state.lifecycle = { status: "running", startedAt: state.updatedAt, finishedAt: null, beforeBalance: state.initial, afterBalance: null, returnPct: null, targetReturnPct: 1, reviewDecision: "pending" };
  state.positions = [{ ticker: "005930", quantity: 10, entry: 10_000, mark: 10_000, bidMark: 10_000, enteredAt: now, lastFreshAt: now }];
  state.cash -= 100_000 + Math.ceil(100_000 * RULES.fee);
  return state;
}
const fresh: Quote = { ticker: "005930", name: "삼성전자", price: 10_000, bid: 10_000, ask: 10_001, bidQty: 100, askQty: 100, previousHigh: 9_900, volumeRatio: 2, spreadBps: 1, ageMs: 0, halted: false };

describe("보유 관측 공백 보호", () => {
  it("30초 직전까지 유지하고 30초 경계에 종료를 고정한다", () => {
    const state = held();
    expect(enforceObservationSafety(state, now + RULES.marketGapMs - 1)).toBe(false);
    expect(enforceObservationSafety(state, now + RULES.marketGapMs)).toBe(true);
    expect(state).toMatchObject({ running: false, killed: true, lifecycle: { status: "stopping", stopCause: "data-gap" } });
    expect(state.positions).toHaveLength(1);
  });
  it("엔진 틱이 최신이어도 보유 시세가 멈추면 종료한다", () => {
    const state = held();
    state.lastStepAt = now + 35_000;
    expect(enforceObservationSafety(state, now + 35_000)).toBe(true);
    expect(state.lifecycle?.stopCause).toBe("data-gap");
  });
  it("공백 직후 신선한 시세가 와도 보유 청산을 먼저 하고 신규매수를 막는다", () => {
    const state = held();
    step(state, [fresh], 600, 1, now + 35_000);
    expect(state.lifecycle).toMatchObject({ status: "completed", stopCause: "data-gap" });
    expect(state.positions).toHaveLength(0);
    expect(state.trades).toHaveLength(1);
    expect(state.trades[0]).toMatchObject({ side: "sell", reason: "data-gap" });
  });
  it("시세가 없으면 즉시 체결을 만들지 않고 종료 기한에만 가상 정산한다", () => {
    const state = held();
    const detected = now + 35_000;
    step(state, [{ ...fresh, ageMs: 5_001 }], 600, 1, detected);
    expect(state.trades).toHaveLength(0);
    expect(state.positions).toHaveLength(1);
    expect(settleExpiredPaperStop(state, 600, detected + PAPER_STOP_TIMEOUT_MS - 1)).toBe(false);
    expect(settleExpiredPaperStop(state, 601, detected + PAPER_STOP_TIMEOUT_MS)).toBe(true);
    expect(state.trades[0]).toMatchObject({ reason: "timeout" });
    expect(state.lifecycle?.forcedAt).toBe(new Date(detected + PAPER_STOP_TIMEOUT_MS).toISOString());
  });
  it("구버전 보유에 진입·시세 관측시각이 없으면 안전 종료한다", () => {
    const state = held();
    delete state.positions[0].enteredAt;
    delete state.positions[0].lastFreshAt;
    expect(enforceObservationSafety(state, now)).toBe(true);
    expect(state.lifecycle?.stopCause).toBe("data-gap");
  });
  it("종료를 다시 감지해도 기한을 늘리지 않고 완료 세션을 변경하지 않는다", () => {
    const state = held();
    enforceObservationSafety(state, now + 35_000);
    const deadlineStart = state.lifecycle?.stopRequestedAt;
    expect(enforceObservationSafety(state, now + 40_000)).toBe(false);
    expect(state.lifecycle?.stopRequestedAt).toBe(deadlineStart);
    settleExpiredPaperStop(state, 601, now + 65_000);
    const completed = structuredClone(state);
    expect(enforceObservationSafety(state, now + 100_000)).toBe(false);
    expect(state).toEqual(completed);
  });
  it("현금 상태도 운용 중 엔진 공백이면 새 진입을 차단한다", () => {
    const state = held();
    state.positions = [];
    expect(enforceObservationSafety(state, now + 35_000)).toBe(true);
    expect(state.running).toBe(false);
  });
  it("반올림된 청산액이 현금·원장·수익률 계산과 일치한다", () => {
    const state = held();
    const expected = liquidation(state.positions[0], fresh.bid);
    const priorCash = state.cash;
    step(state, [fresh], 600, 1, now + 35_000);
    expect(state.trades[0]).toMatchObject({ price: expected.price, fee: expected.fee, net: expected.net });
    expect(state.cash).toBe(priorCash + expected.proceeds);
    expect(state.equity).toBe(state.cash);
    expect(state.lifecycle?.returnPct).toBe((state.cash / state.initial - 1) * 100);
  });
});
