import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { command, initialState as blankState, liquidation, RULES, settleExpiredPaperStop, step } from "../engine";
import type { Quote, TradingState } from "@/lib/types/programTrading/programTrading";

const startedAt = Date.parse("2026-11-19T01:00:10+00:00");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(startedAt); });
afterEach(() => vi.useRealTimers());

function quote(patch: Partial<Quote> = {}): Quote {
  return { ticker: "005930", name: "삼성전자", price: 10100, bid: 10099, ask: 10101, bidQty: 1000, askQty: 1000,
    previousHigh: 10000, volumeRatio: 2, spreadBps: 2, ageMs: 0, halted: false,
    signal: { closedAt: Math.floor(Date.now() / 60000) * 60000, open: 10020, high: 10100, low: 10010, close: 10090, previousHigh: 10000, volumeRatio: 2 }, ...patch };
}
function initialState(): TradingState {
  const s = blankState();
  s.candidates = { status: "ready", rows: [{ ticker: "005930", name: "삼성전자", price: 10100, changePercent: 1, previousClose: 10000, sources: ["volume"] }], checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 120000).toISOString() };
  return s;
}
function run(s: TradingState, quotes = [quote()], milliseconds = 1000, minute = 600, cooldownClock = s.tick + 1) {
  vi.setSystemTime(Date.now() + milliseconds);
  step(s, quotes, minute, cooldownClock);
}
function enter() {
  const s = initialState(); command(s, "start"); run(s);
  expect(s.positions).toHaveLength(1);
  return s;
}
const stopQuote = () => quote({ price: 10000, bid: 9999, ask: 10001 });

describe("paper fills and risk budgets", () => {
  it("buys ask plus slippage, respects fee-inclusive budgets and prevents duplicate holdings", () => {
    const s = initialState(); command(s, "start"); run(s, [quote(), quote()]);
    expect(s.positions).toHaveLength(1);
    const p = s.positions[0];
    expect(p.entry).toBe(Math.ceil(10101 * (1 + RULES.slippage)));
    const cost = p.quantity * p.entry + Math.ceil(p.quantity * p.entry * RULES.fee);
    expect(cost).toBeLessThanOrEqual(s.initial * RULES.allocation);
    expect(cost * RULES.stop).toBeLessThanOrEqual(s.initial * RULES.risk);
    expect(s.cash).toBeGreaterThanOrEqual(0);
    expect(s.trades[0].evidence?.candidate?.ticker).toBe("005930");
    expect(s.trades[0].evidence?.quote.signal?.closedAt).toBe(quote().signal!.closedAt);
  });
  it("sells at bid less slippage with the same integer fees used by valuation", () => {
    const s = enter(); const p = structuredClone(s.positions[0]); const q = quote({ price: 10200, bid: 10199, ask: 10201 });
    const expected = liquidation(p, q.bid);
    s.quotes = [q]; command(s, "flatten");
    expect(s.trades.at(-1)).toMatchObject({ price: expected.price, fee: expected.fee, net: expected.net });
    expect(s.equity).toBe(s.initial + expected.net);
    expect(s.positions).toHaveLength(0);
  });
  it("caps fills to both visible sides of the book and rejects zero quantity", () => {
    const s = initialState(); command(s, "start"); run(s, [quote({ askQty: 3, bidQty: 2 })]);
    expect(s.positions[0].quantity).toBe(2);
    for (const patch of [{ askQty: 0 }, { bidQty: 0 }, { bidQty: NaN }]) {
      const next = initialState(); command(next, "start"); run(next, [quote(patch)]); expect(next.positions).toHaveLength(0);
    }
  });
  it("rejects stale, halted, invalid, crossed and wide books", () => {
    for (const patch of [{ ageMs: 6000 }, { ageMs: NaN }, { halted: true }, { price: NaN }, { bid: 10102 }, { bid: undefined }, { bid: 10080, ask: 10101 }]) {
      const s = initialState(); command(s, "start"); run(s, [quote(patch)]); expect(s.positions).toHaveLength(0);
    }
  });
  it("blocks excessive round-trip costs even when spread is within its ceiling", () => {
    const s = initialState(); s.candidates.rows[0].previousClose = 400;
    const q = quote({ price: 500, bid: 500, ask: 500.35, signal: { closedAt: quote().signal!.closedAt, open: 499, high: 500.2, low: 498, close: 500, previousHigh: 499, volumeRatio: 2 } });
    // Floating spread cost passes; integer buy/sell rounding makes this low-priced fill too expensive.
    expect((q.ask! - q.bid!) / ((q.ask! + q.bid!) / 2) * 10000).toBeLessThan(RULES.maxSpreadBps);
    const cost = 1 - q.bid! * (1 - RULES.slippage) * (1 - RULES.fee - RULES.sellTax) / (q.ask! * (1 + RULES.slippage) * (1 + RULES.fee));
    expect(cost).toBeLessThan(RULES.maxRoundTripCost);
    const integerEntry = Math.ceil(q.ask! * (1 + RULES.slippage));
    expect(-liquidation({ ticker: q.ticker, quantity: 1000, entry: integerEntry, mark: q.price }, q.bid).netReturn).toBeGreaterThan(RULES.maxRoundTripCost);
    command(s, "start"); run(s, [q]); expect(s.positions).toHaveLength(0);
  });
});

describe("completed candle signal", () => {
  it("requires the latest completed boundary, a bullish candle, volume and breakout", () => {
    for (const signal of [undefined, { ...quote().signal!, closedAt: quote().signal!.closedAt - 60000 }, { ...quote().signal!, closedAt: quote().signal!.closedAt + 60000 }, { ...quote().signal!, open: 10100 }, { ...quote().signal!, volumeRatio: 1 }, { ...quote().signal!, previousHigh: 10090 }]) {
      const s = initialState(); command(s, "start"); run(s, [quote({ signal })]); expect(s.positions).toHaveLength(0);
    }
  });
  it("rejects price reversal below the signal close and excessive chase", () => {
    for (const patch of [{ price: 10089 }, { price: 10120 }, { price: 10120, bid: 10119, ask: 10121 }]) {
      const s = initialState(); command(s, "start"); run(s, [quote(patch)]); expect(s.positions).toHaveLength(0);
    }
  });
  it("does not reuse the same completed candle after closing a winning trade", () => {
    const s = enter(); run(s, [quote({ price: 10300, bid: 10299, ask: 10301 })]);
    expect(s.trades.at(-1)?.reason).toBe("target");
    run(s, [quote()], 1000, 600, 1000); expect(s.positions).toHaveLength(0);
  });
});

describe("short exposure exits", () => {
  it("uses net return for stops and keeps risk management while paused", () => {
    const s = enter(); command(s, "pause"); run(s, [stopQuote()]);
    expect(s.positions).toHaveLength(0); expect(s.trades.at(-1)?.reason).toBe("stop"); expect(s.realized).toBeLessThan(0);
  });
  it("takes profit after costs rather than stopping at a gross 1% rise", () => {
    const s = enter(); const entry = s.positions[0].entry;
    run(s, [quote({ price: Math.ceil(entry * 1.01), bid: Math.ceil(entry * 1.01) - 1, ask: Math.ceil(entry * 1.01) + 1 })]);
    expect(s.positions).toHaveLength(1);
    run(s, [quote({ price: 10300, bid: 10299, ask: 10301 })]);
    expect(s.trades.at(-1)?.reason).toBe("target"); expect(s.realized).toBeGreaterThan(0);
  });
  it("trails a positive net gain without mistaking a loss for protection", () => {
    const s = enter(); run(s, [quote({ price: 10220, bid: 10219, ask: 10221 })]);
    expect(s.positions).toHaveLength(1); expect(s.positions[0].peakNet).toBeGreaterThanOrEqual(RULES.trailArm);
    run(s, [quote({ price: 10180, bid: 10179, ask: 10181 })]);
    expect(s.trades.at(-1)?.reason).toBe("trail"); expect(s.realized).toBeGreaterThan(0);
  });
  it("exits at five wall-clock minutes regardless of tick count", () => {
    const s = enter(); const entryAt = s.positions[0].enteredAt!;
    for (let elapsed = 10000; elapsed < 300000; elapsed += 10000) run(s, [quote()], 10000);
    expect(Date.now() - entryAt).toBe(290000); expect(s.positions).toHaveLength(1);
    run(s, [quote()], 10000); expect(s.trades.at(-1)?.reason).toBe("time-exit"); expect(s.positions).toHaveLength(0);
  });
  it("does not reenter on the same tick as a stop and blocks a losing ticker for the session", () => {
    const s = enter(); s.candidates.rows.push({ ...s.candidates.rows[0], ticker: "000660" });
    run(s, [stopQuote(), quote(), quote({ ticker: "000660" })]);
    expect(s.positions).toHaveLength(0); expect(s.trades).toHaveLength(2); expect(s.blockedTickers).toContain("005930");
    run(s, [], 20000); run(s, [], 20000); run(s, [], 20000);
    const freshSignal = quote();
    expect(freshSignal.signal!.closedAt).toBeGreaterThan(s.signalTimes!["005930"]);
    run(s, [freshSignal], 1000, 601, 10000);
    expect(s.positions).toHaveLength(0); expect(s.lifecycle?.status).toBe("running");
  });
  it("stops the session after two consecutive losses on different tickers", () => {
    const s = enter(); run(s, [stopQuote()]);
    s.candidates.rows.push({ ...s.candidates.rows[0], ticker: "000660" });
    run(s, [quote({ ticker: "000660" })]); expect(s.positions).toHaveLength(1);
    run(s, [quote({ ...stopQuote(), ticker: "000660" })]);
    expect(s.lossStreak).toBe(2); expect(s.lifecycle?.stopCause).toBe("loss-streak"); expect(s.lifecycle?.status).toBe("completed");
    command(s, "start"); expect(s.running).toBe(false);
  });
  it("resets consecutive losses after a profitable exit", () => {
    const s = enter(); s.lossStreak = 1; run(s, [quote({ price: 10300, bid: 10299, ask: 10301 })]);
    expect(s.lossStreak).toBe(0); expect(s.lifecycle?.status).toBe("running");
  });
  it("enforces a maximum number of entries without forcing additional trades", () => {
    const s = initialState(); s.entryCount = RULES.maxEntries; command(s, "start"); run(s);
    expect(s.trades).toHaveLength(0); expect(s.lifecycle?.stopCause).toBe("trade-limit");
  });
});

describe("session targets and monitoring gaps", () => {
  it("automatically liquidates and finishes after the account target, and cannot restart", () => {
    const s = enter(); run(s, [quote({ price: 12000, bid: 11999, ask: 12001 })]);
    expect(s.trades.at(-1)?.reason).toBe("session-target"); expect(s.lifecycle?.status).toBe("completed");
    expect(s.lifecycle?.returnPct).toBeGreaterThanOrEqual(1); expect(s.lifecycle?.reviewDecision).toBe("keep");
    command(s, "start"); expect(s.running).toBe(false);
  });
  it("latches the account loss limit and cannot restart", () => {
    const s = enter(); run(s, [quote({ price: 9000, bid: 8999, ask: 9001 })]);
    expect(s.killed).toBe(true); expect(s.trades.at(-1)?.reason).toBe("kill"); expect(s.positions).toHaveLength(0);
    command(s, "start"); expect(s.running).toBe(false);
  });
  it("allows less than 30 seconds but stops at a 30-second process gap before a fresh signal", () => {
    const s = enter(); run(s, [quote()], 29999); expect(s.lifecycle?.status).toBe("running");
    run(s, [quote()], 30000); expect(s.trades.at(-1)?.reason).toBe("data-gap"); expect(s.lifecycle?.status).toBe("completed");
    const flat = initialState(); command(flat, "start"); run(flat, [quote()], 30001);
    expect(flat.positions).toHaveLength(0); expect(flat.lifecycle?.stopCause).toBe("data-gap");
  });
  it("detects a held ticker quote gap while process ticks continue", () => {
    const s = enter(); run(s, [], 15000); run(s, [], 14999); expect(s.lifecycle?.status).toBe("running");
    run(s, [], 1); expect(s.lifecycle?.status).toBe("stopping"); expect(s.lifecycle?.stopCause).toBe("data-gap");
    expect(s.positions).toHaveLength(1); run(s, [quote()]); expect(s.positions).toHaveLength(0);
  });
  it("waits for a valid quote and uses an explicit timeout only after the stop deadline", () => {
    const s = enter(); s.quotes = [quote({ halted: true })]; command(s, "flatten");
    expect(s.lifecycle?.status).toBe("stopping"); expect(s.lifecycle?.afterBalance).toBeNull(); expect(s.trades).toHaveLength(1);
    const requested = Date.parse(s.lifecycle!.stopRequestedAt!);
    expect(settleExpiredPaperStop(s, 600, requested + 29999)).toBe(false);
    expect(settleExpiredPaperStop(s, 600, requested + 30000)).toBe(true);
    expect(s.trades.at(-1)?.reason).toBe("timeout"); expect(s.lifecycle?.forcedAt).toBeDefined(); expect(s.lifecycle?.status).toBe("completed");
  });
  it("preserves the original gap across pause/start while holding", () => {
    const s = enter(); command(s, "pause"); vi.setSystemTime(Date.now() + 31000); command(s, "start"); run(s);
    expect(s.lifecycle?.stopCause).toBe("data-gap"); expect(s.positions).toHaveLength(0);
  });
  it("closes at 15:20, blocks entries from 14:30 and makes flatten idempotent", () => {
    const late = initialState(); command(late, "start"); run(late, [quote()], 1000, RULES.entryEnd); expect(late.positions).toHaveLength(0);
    const s = enter(); run(s, [quote()], 1000, RULES.closeMinute); expect(s.trades.at(-1)?.reason).toBe("close");
    const cash = s.cash; command(s, "flatten"); expect(s.cash).toBe(cash); expect(s.running).toBe(false);
  });
});

describe("rising volume candidates", () => {
  it("refuses missing, expired and invalid candidate lists", () => {
    const missing = blankState(); command(missing, "start"); expect(missing.running).toBe(false);
    for (const patch of [{ changePercent: undefined }, { changePercent: 0 }, { changePercent: -1 }, { previousClose: NaN }, { sources: ["foreign"] }, { sources: ["volume", "institution"] }]) {
      const s = initialState(); Object.assign(s.candidates.rows[0], patch); command(s, "start"); expect(s.running).toBe(false);
    }
    const expired = initialState(); expired.candidates.checkedAt = new Date(Date.now() - 121000).toISOString(); expired.candidates.expiresAt = new Date(Date.now() - 1000).toISOString();
    command(expired, "start"); expect(expired.running).toBe(false);
  });
  it("rejects symbols outside the volume list, mixed flow-only rows and now-falling prices", () => {
    const s = initialState(); s.candidates.rows.push({ ...s.candidates.rows[0], ticker: "000660", sources: ["foreign"] }); command(s, "start");
    for (const q of [quote({ ticker: "999999" }), quote({ ticker: "000660" }), quote({ price: 10000 })]) { run(s, [q]); expect(s.positions).toHaveLength(0); }
  });
  it("continues stop management when a candidate disappears or expires", () => {
    for (const status of ["empty", "unavailable", "ready"] as const) {
      const s = enter(); s.candidates = { status, rows: [], checkedAt: new Date(0).toISOString(), expiresAt: new Date(0).toISOString() };
      run(s, [stopQuote()]); expect(s.positions).toHaveLength(0); expect(s.trades.at(-1)?.reason).toBe("stop");
    }
  });
});

it("requires a fresh session instead of mixing an active legacy policy with v5", () => {
  const state = initialState();
  command(state, "start");
  delete state.policyVersion;
  command(state, "start");
  expect(state.running).toBe(false);
  expect(state.lifecycle).toMatchObject({ status: "completed", stopCause: "data-gap" });
});
