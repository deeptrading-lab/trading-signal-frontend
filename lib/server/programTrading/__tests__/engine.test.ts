import { expect, it } from "vitest";
import type { CandidateSnapshot, ProgramCandidate } from "@/lib/types/programTrading/programTrading";
import { buyCandidates, closeSession, initialState, observePrices, startSession } from "../engine";

const now = Date.parse("2026-11-09T09:05:00+09:00");
const at = new Date(now).toISOString();
function ranked(ticker: string, price: number, rank: number): ProgramCandidate {
  return { ticker, name: ticker, price, rank, volume: 2_000_000, changePercent: 2, previousClose: 1, sources: ["volume"] };
}
function opened(rows: ProgramCandidate[], cash = 10_000_000) {
  const state = { ...initialState(now), cash, equity: cash, minute: 545 };
  startSession(state, now, now);
  const snapshot: CandidateSnapshot = { status: "ready", rows, checkedAt: at, rankedAt: at, expiresAt: at };
  buyCandidates(state, snapshot, now);
  return state;
}

it("fixes an equal cash budget, floors share counts and skips an unaffordable candidate", () => {
  const state = opened([ranked("005930", 30_000, 1), ranked("000660", 200_000, 2), ranked("035720", 40_000, 3)], 300_000);
  expect(state.positions.map(({ ticker, quantity }) => [ticker, quantity])).toEqual([["005930", 3], ["035720", 2]]);
  expect(state.cash).toBe(130_000);
  expect(state.trades[0]).toMatchObject({ fee: 0, reason: "volume-rank", evidence: { candidate: { rank: 1, volume: 2_000_000 } } });
  expect(state.nextPriceAt).toBe(now + 300_000);
});

it("매수 직전 20% 초과 종목을 차단하고 통과 종목에만 예산을 균등 배정한다", () => {
  const state = opened([
    { ...ranked("005930", 100, 1), changePercent: 19.99 },
    { ...ranked("000660", 100, 2), changePercent: 20 },
    { ...ranked("035720", 100, 3), changePercent: 20.01 },
    { ...ranked("068270", 100, 4), changePercent: 30 },
  ], 10_000);
  expect(state.positions.map(({ ticker, quantity }) => [ticker, quantity])).toEqual([["005930", 50], ["000660", 50]]);
  expect(state.cash).toBe(0);
  expect(state.trades.map(trade => trade.ticker)).toEqual(["005930", "000660"]);
  expect(state.candidates.rows.map(candidate => candidate.ticker)).toEqual(["005930", "000660"]);
  expect(state.trades[0].evidence?.rules.maxEntryChangePercent).toBe(20);
});

it("3종목 보유 중 남은 100만 원을 신규 두 후보에만 균등 배분하고 매도 점검 시각을 유지한다", () => {
  const state = opened([ranked("005930", 1_000_000, 1), ranked("000660", 1_000_000, 2), ranked("035720", 1_000_000, 3)], 4_000_000);
  expect(state.cash).toBe(1_000_000);
  const priceDueAt = state.nextPriceAt;
  const held = structuredClone(state.positions);
  buyCandidates(state, { ...state.candidates, rows: [
    ranked("005930", 1_000_000, 1), ranked("068270", 100_000, 2),
    ranked("051910", 100_000, 3), ranked("068270", 100_000, 4),
  ] }, now + 60_000);
  expect(state.positions.slice(0, 3)).toEqual(held);
  expect(state.positions.slice(3).map(({ ticker, quantity }) => [ticker, quantity])).toEqual([["068270", 5], ["051910", 5]]);
  expect(state.cash).toBe(0);
  expect(state.equity).toBe(4_000_000);
  expect(state.nextPriceAt).toBe(priceDueAt);
});

it("기존 보유 종목만 후보에 있으면 추가 매수하지 않고 잔액을 유지한다", () => {
  const state = opened([ranked("005930", 600_000, 1)], 1_000_000);
  buyCandidates(state, state.candidates, now + 60_000);
  expect(state.trades).toHaveLength(1);
  expect(state.positions).toHaveLength(1);
  expect(state.cash).toBe(400_000);
});

it.each([540, 900, 930])("신규 매수 시간 밖에는 엔진도 직접 매수를 차단한다 (%i)", minute => {
  const state = opened([], 1_000_000);
  state.minute = minute;
  buyCandidates(state, { ...state.candidates, rows: [ranked("005930", 100_000, 1)] }, now);
  expect(state.positions).toEqual([]);
  expect(state.cash).toBe(1_000_000);
});

it("일시정지된 세션에는 추가 매수하지 않는다", () => {
  const state = opened([], 1_000_000);
  state.running = false;
  buyCandidates(state, { ...state.candidates, rows: [ranked("005930", 100_000, 1)] }, now);
  expect(state.trades).toEqual([]);
});

it.each([20.01, 30, 0, -1, NaN, Infinity])("매수 가능한 종목이 없으면 현금 유지 및 다음 후보 조회 대기 (%s)", changePercent => {
  const state = opened([{ ...ranked("005930", 100, 1), changePercent }], 10_000);
  expect(state.cash).toBe(10_000);
  expect(state.equity).toBe(10_000);
  expect(state.positions).toEqual([]);
  expect(state.trades).toEqual([]);
  expect(state.candidates).toMatchObject({ status: "empty", rows: [] });
  expect(state.nextCandidateAt).toBe(now + 600_000);
  expect(state.nextPriceAt).toBeUndefined();
});

it("sells at both exact thresholds while keeping holdings missing from the price response", () => {
  const state = opened([ranked("005930", 100, 1), ranked("000660", 100, 2), ranked("035720", 100, 3)]);
  const observedAt = now + 300_000;
  observePrices(state, new Map([["005930", { price: 102, at: observedAt }], ["000660", { price: 99, at: observedAt }]]), observedAt);
  expect(state.trades.slice(-2).map(({ reason, fee }) => [reason, fee])).toEqual([["target", 0], ["stop", 0]]);
  expect(state.positions.map(item => item.ticker)).toEqual(["035720"]);
  expect(state.running).toBe(true);
});

it("waits for all holdings to clear before testing the session loss threshold", () => {
  const state = opened([ranked("005930", 100, 1), ranked("000660", 100, 2)], 10_000);
  observePrices(state, new Map([["005930", { price: 96, at: now + 300_000 }]]), now + 300_000);
  expect(state.cash + state.positions[0].mark * state.positions[0].quantity).toBe(9_800);
  expect(state.running).toBe(true);
  observePrices(state, new Map([["000660", { price: 99, at: now + 600_000 }]]), now + 600_000);
  expect(state.lifecycle?.stopCause).toBe("session-loss");
});

it.each([
  [[102, 100], undefined], // A holding remains.
  [[103, 99], "session-target"], // Exact +1%.
  [[97, 99], "session-loss"], // Exact −2%.
  [[102, 99], undefined], // Flat holdings and inside the session limits.
] as const)("tests session thresholds only when flat for price changes %j", ([first, second], cause) => {
  const state = opened([ranked("005930", 100, 1), ranked("000660", 100, 2)], 10_000);
  const at = now + 300_000;
  observePrices(state, new Map([["005930", { price: first, at }], ["000660", { price: second, at }]]), at);
  expect(state.lifecycle?.stopCause).toBe(cause);
  if (!cause && !state.positions.length) expect(state.nextCandidateAt).toBe(at);
});

it("closes with a fresh price when available and marks the remaining settlement separately", () => {
  const state = opened([ranked("005930", 100, 1), ranked("000660", 100, 2)], 10_000);
  const at = now + 300_000;
  closeSession(state, new Map([["005930", { price: 101, at }]]), "close", at);
  expect(state.trades.slice(-2).map(({ price, reason }) => [price, reason])).toEqual([[101, "close"], [100, "last-mark"]]);
  expect(state.lifecycle).toMatchObject({ stopCause: "close", status: "completed", forcedAt: new Date(at).toISOString() });
});

it.each(["program-v6-volume-basket", "program-v7-afternoon-close"])("%s 보유분을 종료할 때 기존 비용 0 정책을 유지한다", policyVersion => {
  const state = opened([ranked("005930", 100, 1)], 10_000);
  state.policyVersion = policyVersion;
  closeSession(state, new Map([["005930", { price: 101, at: now }]]), "manual", now);
  expect(state.trades.at(-1)).toMatchObject({ price: 101, fee: 0, net: 100, reason: "manual" });
  expect(state.cash).toBe(10_100);
});

it.each([899, 900, 910])("closes positive total equity only from 15:00 (minute %i)", minute => {
  const state = opened([ranked("005930", 1000, 1), ranked("000660", 1000, 2)], 10_000);
  state.minute = minute;
  const observedAt = Date.parse("2026-11-09T00:00:00+09:00") + minute * 60_000;
  // One losing position is included in the account-wide liquidation.
  observePrices(state, new Map([["005930", { price: 1005, at: observedAt }], ["000660", { price: 999, at: observedAt }]]), observedAt);
  expect(state.lifecycle?.status).toBe(minute >= 900 ? "completed" : "running");
  if (minute >= 900) {
    expect(state.positions).toEqual([]);
    expect(state.trades.slice(-2).map(t => t.reason)).toEqual(["afternoon-profit", "afternoon-profit"]);
    expect(state.lifecycle?.returnPct).toBeCloseTo(0.2);
  }
});

it.each([1000, 999])("does not close flat or negative total returns after 15:00 (price %i)", price => {
  const state = opened([ranked("005930", 1000, 1)], 10_000);
  state.minute = 900;
  observePrices(state, new Map([["005930", { price, at: now + 3600000 }]]), now + 3600000);
  expect(state.running).toBe(true);
  expect(state.positions).toHaveLength(1);
});

it("does not use a partial price response to trigger account-wide profit closure", () => {
  const state = opened([ranked("005930", 1000, 1), ranked("000660", 1000, 2)], 10_000);
  state.minute = 900;
  observePrices(state, new Map([["005930", { price: 1005, at: now + 3600000 }]]), now + 3600000);
  expect(state.running).toBe(true);
  expect(state.positions).toHaveLength(2);
});
