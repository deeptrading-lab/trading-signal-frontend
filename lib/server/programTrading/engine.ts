import { hasCandidates, emptyCandidateSnapshot, isRisingVolumeCandidate } from "@/lib/validation/programTrading/candidateGate";
import type { Command, Position, Quote, Reason, TradingState } from "@/lib/types/programTrading/programTrading";

// Experimental paper policy, not fitted or validated expected returns.
export const RULES_VERSION = "program-v5-short-exposure";
export const RULES = {
  sessionTarget: .01, stop: .008, target: .01, dailyLoss: .006,
  allocation: .15, risk: .001, maxPositions: 1, cooldown: 10,
  fee: .00015, sellTax: .002, slippage: .0005,
  maxHoldMinutes: 5, maxLossStreak: 2, maxEntries: 10,
  maxSpreadBps: 7, maxRoundTripCost: .004,
  breakout: .001, maxChase: .002, minVolumeRatio: 1.5,
  entryStart: 550, entryEnd: 870, closeMinute: 920, marketGapMs: 30_000,
  trailArm: .006, trailGap: .003, trailFloor: .001,
} as const;
export const PAPER_STOP_TIMEOUT_MS = 30_000;
type StopCause = NonNullable<TradingState["lifecycle"]>["stopCause"];

export function initialState(): TradingState {
  return { policyVersion: RULES_VERSION, version: 1, candidates: emptyCandidateSnapshot(), running: false, killed: false, tick: 0, minute: RULES.entryStart, cash: 10_000_000, initial: 10_000_000, equity: 10_000_000, realized: 0, positions: [], trades: [], quotes: [], cooldown: {}, entryCount: 0, lossStreak: 0, blockedTickers: [], signalTimes: {}, updatedAt: new Date().toISOString(), lastError: null };
}

/** Identical integer rounding for liquidation valuation, exit decisions and the ledger. */
export function liquidation(position: Position, bid = position.bidMark ?? position.mark) {
  const price = Math.floor(bid * (1 - RULES.slippage));
  const gross = price * position.quantity;
  const fee = Math.ceil(gross * (RULES.fee + RULES.sellTax));
  const cost = position.entry * position.quantity + Math.ceil(position.entry * position.quantity * RULES.fee);
  return { price, fee, proceeds: gross - fee, net: gross - fee - cost, netReturn: (gross - fee) / cost - 1 };
}
function mark(s: TradingState) {
  s.equity = s.cash + s.positions.reduce((total, position) => total + liquidation(position).proceeds, 0);
}
export function finishSession(s: TradingState) {
  if (!s.lifecycle || s.lifecycle.status === "idle" || s.lifecycle.status === "completed" || s.running || s.positions.length) return;
  if (s.lifecycle.status !== "stopping" && !s.killed && s.minute < RULES.closeMinute) return;
  const after = s.equity;
  const result = (after / s.lifecycle.beforeBalance - 1) * 100;
  s.lifecycle = { ...s.lifecycle, status: "completed", finishedAt: s.updatedAt, afterBalance: after, returnPct: result, reviewDecision: result >= s.lifecycle.targetReturnPct ? "keep" : "review" };
}
function validQuote(q: Quote | undefined): q is Quote & { bid: number; ask: number; bidQty: number; askQty: number } {
  return !!q && !q.halted && [q.ageMs, q.price, q.bid, q.ask, q.bidQty, q.askQty].every(Number.isFinite)
    && q.ageMs >= 0 && q.ageMs <= 5000 && q.price > 0 && q.bid! > 0 && q.ask! >= q.bid! && q.bidQty! > 0 && q.askQty! > 0;
}
export function requestSessionStop(s: TradingState, cause: StopCause, now = Date.now()) {
  if (s.lifecycle?.status === "completed") return;
  s.running = false;
  s.lifecycle ??= { status: "running", startedAt: s.updatedAt, finishedAt: null, beforeBalance: s.initial, afterBalance: null, returnPct: null, targetReturnPct: RULES.sessionTarget * 100, reviewDecision: "pending" };
  s.lifecycle.status = "stopping";
  s.lifecycle.stopRequestedAt ??= new Date(now).toISOString();
  s.lifecycle.stopCause ??= cause;
  if (["kill", "loss-streak", "data-gap"].includes(cause ?? "")) s.killed = true;
}
function sell(s: TradingState, ticker: string, reason: Reason, cooldownClock = s.tick) {
  const q = s.quotes.find(quote => quote.ticker === ticker);
  if (reason !== "timeout" && !validQuote(q)) return;
  const position = s.positions.find(item => item.ticker === ticker);
  if (!position) return;
  if (validQuote(q)) { position.mark = q.price; position.bidMark = q.bid; }
  const result = liquidation(position);
  s.cash += result.proceeds;
  s.realized += result.net;
  s.positions = s.positions.filter(item => item.ticker !== ticker);
  s.cooldown[ticker] = cooldownClock + RULES.cooldown;
  s.lossStreak = result.net < 0 ? (s.lossStreak ?? 0) + 1 : 0;
  if (result.net < 0 && !s.blockedTickers?.includes(ticker)) (s.blockedTickers ??= []).push(ticker);
  s.trades.push({ id: `${s.tick}-${ticker}-sell`, minute: s.minute, ticker, name: position.name, side: "sell", quantity: position.quantity, price: result.price, fee: result.fee, reason, net: result.net,
    evidence: q ? { quote: structuredClone(q), candidateCheckedAt: s.candidates.checkedAt, rules: { ...RULES }, observedAt: Date.parse(s.updatedAt), entryAt: position.enteredAt, peakNet: position.peakNet } : undefined });
}
export function command(s: TradingState, action: Command, stopCause: "manual" | "close" | "kill" = "manual") {
  if (s.lifecycle?.status === "completed") return;
  const now = Date.now();
  s.updatedAt = new Date(now).toISOString();
  if (action === "start" && s.lifecycle && s.policyVersion !== RULES_VERSION) {
    requestSessionStop(s, "data-gap", now);
    mark(s); finishSession(s);
    return;
  }
  if (action === "start" && !s.lastError && !s.killed && s.minute >= RULES.entryStart && s.minute < RULES.entryEnd && hasCandidates(s.candidates)) {
    if (s.lifecycle?.status === "stopping") return;
    s.lifecycle = { status: "running", startedAt: s.lifecycle?.startedAt ?? new Date(now).toISOString(), finishedAt: null, beforeBalance: s.lifecycle?.beforeBalance ?? s.equity, afterBalance: null, returnPct: null, targetReturnPct: s.lifecycle?.targetReturnPct ?? RULES.sessionTarget * 100, reviewDecision: "pending" };
    // Pause/start must not erase a gap in held-position monitoring.
    if (!s.positions.length) s.lastStepAt = now;
    s.running = true;
  }
  if (action === "pause") s.running = false;
  if (action === "flatten") {
    requestSessionStop(s, stopCause, now);
    for (const position of [...s.positions]) sell(s, position.ticker, s.lifecycle?.stopCause ?? stopCause);
  }
  s.updatedAt = new Date(now).toISOString();
  mark(s);
  finishSession(s);
}
export function paperStopDeadline(lifecycle?: TradingState["lifecycle"]): number {
  const requested = Date.parse(lifecycle?.stopRequestedAt ?? "");
  return Number.isFinite(requested) ? requested + PAPER_STOP_TIMEOUT_MS : Infinity;
}
/** Paper-only last recorded bid; never reported as an observed executable exit. */
export function settleExpiredPaperStop(s: TradingState, minute: number, now = Date.now()): boolean {
  if (s.lifecycle?.status !== "stopping" || now < paperStopDeadline(s.lifecycle)) return false;
  s.running = false; s.tick++; s.minute = minute; s.updatedAt = new Date(now).toISOString(); s.quotes = [];
  if (s.positions.length) s.lifecycle.forcedAt = s.updatedAt;
  for (const position of [...s.positions]) sell(s, position.ticker, "timeout");
  mark(s); finishSession(s);
  return true;
}
function enforceSessionLimits(s: TradingState, now: number) {
  const baseline = s.lifecycle?.beforeBalance ?? s.initial;
  if (s.equity <= baseline * (1 - RULES.dailyLoss)) requestSessionStop(s, "kill", now);
  else if (s.equity >= baseline * (1 + RULES.sessionTarget)) requestSessionStop(s, "session-target", now);
  else if ((s.lossStreak ?? 0) >= RULES.maxLossStreak) requestSessionStop(s, "loss-streak", now);
  else if ((s.entryCount ?? 0) >= RULES.maxEntries && !s.positions.length) requestSessionStop(s, "trade-limit", now);
}
function entrySignal(q: Quote, now: number): boolean {
  const signal = q.signal;
  if (!validQuote(q) || !signal || !Object.values(signal).every(Number.isFinite)) return false;
  const boundary = Math.floor(now / 60_000) * 60_000;
  const spread = (q.ask - q.bid) / ((q.ask + q.bid) / 2) * 10_000;
  const cost = 1 - q.bid * (1 - RULES.slippage) * (1 - RULES.fee - RULES.sellTax) / (q.ask * (1 + RULES.slippage) * (1 + RULES.fee));
  return signal.closedAt === boundary && signal.low > 0 && signal.high >= signal.close && signal.high >= signal.open
    && signal.low <= signal.open && signal.low <= signal.close && signal.close > signal.open
    && signal.previousHigh > 0 && signal.close > signal.previousHigh * (1 + RULES.breakout)
    && signal.volumeRatio >= RULES.minVolumeRatio && q.price >= signal.close
    && q.price <= signal.close * (1 + RULES.maxChase) && q.ask <= signal.close * (1 + RULES.maxChase) && spread <= RULES.maxSpreadBps && cost <= RULES.maxRoundTripCost;
}

/** Commit this guard on the serialized live state before any remote IO. */
export function enforceObservationSafety(s: TradingState, now = Date.now()): boolean {
  if (s.lifecycle?.status === "completed" || s.lifecycle?.status === "stopping" || (!s.running && !s.positions.length)) return false;
  const lastStep = s.lastStepAt ?? Date.parse(s.updatedAt);
  const gap = !Number.isFinite(lastStep) || now - lastStep >= RULES.marketGapMs;
  const missingPosition = s.positions.some(position => {
    const lastFresh = position.lastFreshAt ?? position.enteredAt;
    return lastFresh === undefined || now - lastFresh >= RULES.marketGapMs;
  });
  if (!gap && !missingPosition) return false;
  requestSessionStop(s, "data-gap", now);
  return true;
}

export function step(s: TradingState, quotes: Quote[], minute: number, cooldownClock = s.tick + 1, now = Date.now()) {
  enforceObservationSafety(s, now);
  s.tick++; s.minute = minute; s.quotes = quotes; s.updatedAt = new Date(now).toISOString(); s.lastStepAt = now;
  for (const position of s.positions) {
    const q = quotes.find(item => item.ticker === position.ticker);
    if (validQuote(q)) {
      position.mark = q.price; position.bidMark = q.bid; position.lastFreshAt = now;
      position.peakNet = Math.max(position.peakNet ?? -Infinity, liquidation(position).netReturn);
    }
  }
  mark(s);
  if (s.lifecycle?.status !== "completed") enforceSessionLimits(s, now);
  if (minute >= RULES.closeMinute && (s.running || s.positions.length)) requestSessionStop(s, "close", now);
  const hadPositions = s.positions.length > 0;
  for (const position of [...s.positions]) {
    const change = liquidation(position).netReturn;
    const reason: Reason | null = s.lifecycle?.status === "stopping" ? s.lifecycle.stopCause ?? "manual"
      : change <= -RULES.stop ? "stop" : change >= RULES.target ? "target"
      : (position.peakNet ?? -Infinity) >= RULES.trailArm && change <= Math.max(RULES.trailFloor, position.peakNet! - RULES.trailGap) ? "trail"
      : now - (position.enteredAt ?? 0) >= RULES.maxHoldMinutes * 60_000 ? "time-exit" : null;
    if (reason) sell(s, position.ticker, reason, cooldownClock);
  }
  mark(s);
  if (s.lifecycle?.status !== "completed") enforceSessionLimits(s, now);
  const candidatesReady = hasCandidates(s.candidates, now);
  if (!candidatesReady && s.executionMode !== "toss-paper") s.running = false;
  if (!hadPositions && s.running && candidatesReady && !s.killed && minute >= RULES.entryStart && minute < RULES.entryEnd) {
    for (const q of quotes) {
      if (s.positions.length >= RULES.maxPositions || (s.entryCount ?? 0) >= RULES.maxEntries) break;
      const candidate = s.candidates.rows.find(row => row.ticker === q.ticker);
      if (!candidate || !isRisingVolumeCandidate(candidate) || q.price <= candidate.previousClose || s.blockedTickers?.includes(q.ticker)
        || (s.cooldown[q.ticker] ?? 0) > cooldownClock || !entrySignal(q, now) || !validQuote(q)
        || (s.signalTimes?.[q.ticker] ?? 0) >= q.signal!.closedAt) continue;
      const price = Math.ceil(q.ask * (1 + RULES.slippage));
      let quantity = Math.floor(Math.min(s.equity * RULES.allocation / price, s.equity * RULES.risk / (price * (1 + RULES.fee) * RULES.stop), s.cash / (price * (1 + RULES.fee)), q.askQty, q.bidQty));
      // Ceil fees and whole-share fills must respect the capital/risk budgets too.
      while (quantity > 0 && (quantity * price + Math.ceil(quantity * price * RULES.fee) > Math.min(s.cash, s.equity * RULES.allocation)
        || (quantity * price + Math.ceil(quantity * price * RULES.fee)) * RULES.stop > s.equity * RULES.risk)) quantity--;
      if (quantity < 1 || liquidation({ quantity, entry: price, mark: q.price, bidMark: q.bid, ticker: q.ticker }).netReturn < -RULES.maxRoundTripCost) continue;
      const fee = Math.ceil(quantity * price * RULES.fee);
      s.cash -= quantity * price + fee; s.entryCount = (s.entryCount ?? 0) + 1;
      (s.signalTimes ??= {})[q.ticker] = q.signal!.closedAt;
      s.positions.push({ ticker: q.ticker, name: candidate.name, quantity, entry: price, mark: q.price, bidMark: q.bid, enteredAt: now, lastFreshAt: now });
      s.trades.push({ id: `${s.tick}-${q.ticker}-buy`, minute, ticker: q.ticker, name: candidate.name, side: "buy", quantity, price, fee, reason: "breakout", net: null,
        evidence: { quote: structuredClone(q), candidate: structuredClone(candidate), candidateCheckedAt: s.candidates.checkedAt, rules: { ...RULES }, observedAt: now } });
    }
  }
  mark(s); finishSession(s);
  s.trades = s.trades.slice(-2000);
}
