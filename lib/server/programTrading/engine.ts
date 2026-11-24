import type { CandidateSnapshot, Position, Reason, TradingState } from "@/lib/types/programTrading/programTrading";
import type { PaperPrice } from "./tossPaper";

export const RULES_VERSION = "program-v6-volume-basket";
export const RULES = {
  entryStart: 9 * 60,
  candidateStart: 9 * 60 + 5,
  closeMinute: 15 * 60,
  rankingCount: 100,
  minVolume: 1_000_000,
  candidateIntervalMs: 10 * 60_000,
  priceIntervalMs: 5 * 60_000,
  targetPercent: 2,
  stopPercent: 1,
  sessionTargetPercent: 1,
  sessionLossPercent: 2,
} as const;

export function initialState(now = Date.now()): TradingState {
  const at = new Date(now).toISOString();
  return {
    policyVersion: RULES_VERSION, version: 1, executionMode: "toss-paper",
    candidates: { status: "unavailable", rows: [], checkedAt: at, expiresAt: at },
    running: false, killed: false, tick: 0, minute: RULES.entryStart,
    cash: 10_000_000, initial: 10_000_000, equity: 10_000_000, realized: 0,
    positions: [], trades: [], quotes: [], updatedAt: at, lastError: null,
  };
}

export function startSession(state: TradingState, scanAt: number, now: number) {
  state.lifecycle ??= {
    status: "running", startedAt: new Date(now).toISOString(), finishedAt: null,
    beforeBalance: state.equity, afterBalance: null, returnPct: null,
    targetReturnPct: RULES.sessionTargetPercent, reviewDecision: "pending",
  };
  state.nextCandidateAt ??= Math.max(scanAt, now);
  state.running = true;
}

function updateEquity(state: TradingState) {
  state.equity = state.cash + state.positions.reduce((total, position) => total + position.mark * position.quantity, 0);
}

export function buyCandidates(state: TradingState, snapshot: CandidateSnapshot, now: number) {
  state.candidates = snapshot;
  state.nextCandidateAt = now + RULES.candidateIntervalMs;
  if (!snapshot.rows.length) return;

  const budget = Math.floor(state.cash / snapshot.rows.length);
  for (const candidate of snapshot.rows) {
    const { ticker, name, price } = candidate;
    const quantity = Math.floor(budget / price);
    if (quantity < 1) continue;
    state.cash -= quantity * price;
    state.positions.push({ ticker, name, quantity, entry: price, mark: price, enteredAt: now, lastFreshAt: Date.parse(snapshot.rankedAt ?? snapshot.checkedAt) });
    state.trades.push({
      id: `${++state.tick}-${ticker}-buy`, ticker, name, side: "buy", minute: state.minute,
      quantity, price, fee: 0, net: null, reason: "volume-rank",
      evidence: { candidate, candidateCheckedAt: snapshot.rankedAt ?? snapshot.checkedAt, rules: { ...RULES }, observedAt: now },
    });
  }
  if (state.positions.length) state.nextPriceAt = now + RULES.priceIntervalMs;
  updateEquity(state);
}

function sell(state: TradingState, position: Position, price: number, reason: Reason, now: number, fee = 0, entryFee = 0) {
  const proceeds = price * position.quantity - fee;
  const net = proceeds - position.entry * position.quantity - entryFee;
  state.cash += proceeds;
  state.realized += net;
  state.positions = state.positions.filter(item => item !== position);
  state.trades.push({
    id: `${++state.tick}-${position.ticker}-sell`, ticker: position.ticker, name: position.name,
    side: "sell", minute: state.minute, quantity: position.quantity, price, fee, net, reason,
    evidence: { candidateCheckedAt: state.candidates.checkedAt, rules: { ...RULES }, observedAt: now },
  });
}

export function observePrices(state: TradingState, prices: Map<string, PaperPrice>, now: number) {
  for (const position of state.positions) {
    const observation = prices.get(position.ticker);
    if (!observation || observation.at < (position.lastFreshAt ?? 0)) continue;
    position.mark = observation.price;
    position.lastFreshAt = observation.at;
    if (position.mark * 100 >= position.entry * (100 + RULES.targetPercent)) {
      sell(state, position, position.mark, "target", now);
    } else if (position.mark * 100 <= position.entry * (100 - RULES.stopPercent)) {
      sell(state, position, position.mark, "stop", now);
    }
  }
  updateEquity(state);
  if (state.positions.length) {
    state.nextPriceAt = now + RULES.priceIntervalMs;
    return;
  }
  delete state.nextPriceAt;
  state.nextCandidateAt = now;
  const baseline = state.lifecycle!.beforeBalance;
  if (state.cash * 100 >= baseline * (100 + RULES.sessionTargetPercent)) {
    finishSession(state, "session-target", now);
  } else if (state.cash * 100 <= baseline * (100 - RULES.sessionLossPercent)) {
    finishSession(state, "session-loss", now);
  }
}

function finishSession(state: TradingState, cause: NonNullable<NonNullable<TradingState["lifecycle"]>["stopCause"]>, now: number) {
  const lifecycle = state.lifecycle;
  if (!lifecycle) return;
  const after = state.cash;
  state.running = false;
  state.lifecycle = {
    ...lifecycle, status: "completed", stopCause: cause, finishedAt: new Date(now).toISOString(),
    afterBalance: after, returnPct: (after / lifecycle.beforeBalance - 1) * 100,
    reviewDecision: after * 100 >= lifecycle.beforeBalance * (100 + lifecycle.targetReturnPct) ? "keep" : "review",
  };
}

export function closeSession(state: TradingState, prices: Map<string, PaperPrice>, cause: "manual" | "close", now: number) {
  for (const position of state.positions) {
    if (state.policyVersion !== RULES_VERSION) {
      // Retire legacy positions at their historical paper valuation without entering another trade.
      const price = Math.floor((position.bidMark ?? position.mark) * (1 - .0005));
      sell(state, position, price, "timeout", now, Math.ceil(price * position.quantity * (.00015 + .002)), Math.ceil(position.entry * position.quantity * .00015));
      state.lifecycle!.forcedAt = new Date(now).toISOString();
      continue;
    }
    const observation = prices.get(position.ticker);
    const fresh = observation && observation.at >= (position.lastFreshAt ?? 0);
    if (!fresh) state.lifecycle!.forcedAt = new Date(now).toISOString();
    sell(state, position, fresh ? observation.price : position.mark, fresh ? cause : "last-mark", now);
  }
  updateEquity(state);
  finishSession(state, cause, now);
}
