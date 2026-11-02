import { hasCandidates, emptyCandidateSnapshot } from "@/lib/validation/programTrading/candidateGate";
import type { Command, Quote, Reason, TradingState } from "@/lib/types/programTrading/programTrading";
export const RULES = { sessionTarget: .01, stop: .01, target: .02, dailyLoss: .02, allocation: .2, risk: .0025, maxPositions: 2, cooldown: 10, fee: .00015, sellTax: .002, slippage: .0005 } as const;
export function initialState(): TradingState {
  return { version: 1, candidates: emptyCandidateSnapshot(), running: false, killed: false, tick: 0, minute: 550, cash: 10_000_000, initial: 10_000_000, equity: 10_000_000, realized: 0, positions: [], trades: [], quotes: [], cooldown: {}, updatedAt: new Date().toISOString(), lastError: null };
}
export function finishSession(s: TradingState) {
  if (!s.lifecycle || s.lifecycle.status === "idle" || s.lifecycle.status === "completed" || s.running || s.positions.length) return;
  if (s.lifecycle.status !== "stopping" && !s.killed && s.minute < 920) return;
  const after = s.equity;
  const result = (after / s.lifecycle.beforeBalance - 1) * 100;
  s.lifecycle = { ...s.lifecycle, status: "completed", finishedAt: new Date().toISOString(), afterBalance: after, returnPct: result, reviewDecision: result >= s.lifecycle.targetReturnPct ? "keep" : "review" };
}
function mark(s: TradingState) { s.equity = s.cash + s.positions.reduce((v,p) => v + p.quantity * p.mark * (1-RULES.slippage) * (1-RULES.fee-RULES.sellTax), 0); }
function validQuote(q: Quote | undefined): q is Quote { return !!q && !q.halted && Number.isFinite(q.ageMs) && q.ageMs>=0 && q.ageMs<=5000 && Number.isFinite(q.price) && q.price>0; }
function sell(s: TradingState, ticker: string, reason: Reason) {
  const q=s.quotes.find(q=>q.ticker===ticker);
  if(!validQuote(q)) return;
  const p = s.positions.find(p => p.ticker === ticker)!;
  p.mark=q.price;
  const price = Math.floor(p.mark * (1 - RULES.slippage));
  const gross = price * p.quantity;
  const fee = Math.ceil(gross * (RULES.fee + RULES.sellTax));
  const net = gross-fee-p.entry*p.quantity-Math.ceil(p.entry*p.quantity*RULES.fee);
  s.cash += gross-fee; s.realized += net;
  s.positions = s.positions.filter(p => p.ticker !== ticker);
  s.cooldown[ticker] = s.tick + RULES.cooldown;
  s.trades.push({ id: `${s.tick}-${ticker}-sell`, minute: s.minute, ticker, side: "sell", quantity: p.quantity, price, fee, reason, net });
}
export function command(s: TradingState, action: Command) {
  if (s.lifecycle?.status === "completed") return;
  if (action === "start" && !s.lastError && !s.killed && s.minute < 920 && hasCandidates(s.candidates)) {
    if (s.lifecycle?.status === "stopping") return;
    s.lifecycle = { status: "running", startedAt: s.lifecycle?.startedAt ?? new Date().toISOString(), finishedAt: null, beforeBalance: s.lifecycle?.beforeBalance ?? s.equity, afterBalance: null, returnPct: null, targetReturnPct: s.lifecycle?.targetReturnPct ?? RULES.sessionTarget * 100, reviewDecision: "pending" };
    s.running = true;
  }
  if (action === "pause") s.running = false;
  if (action === "flatten") {
    if (!s.lifecycle && (s.positions.length || s.trades.length)) s.lifecycle = { status: "stopping", startedAt: s.updatedAt, finishedAt: null, beforeBalance: s.initial, afterBalance: null, returnPct: null, targetReturnPct: RULES.sessionTarget * 100, reviewDecision: "pending" };
    if (s.lifecycle) s.lifecycle.status = "stopping"; s.running = false; for (const p of [...s.positions]) sell(s,p.ticker,"manual"); }
  mark(s);
  finishSession(s);
}
export function step(s: TradingState, quotes: Quote[], minute: number) {
  s.tick++; s.minute = minute; s.quotes = quotes; s.updatedAt = new Date().toISOString();
  for (const p of s.positions) { const q = quotes.find(q => q.ticker === p.ticker); if (validQuote(q)) p.mark=q.price; }
  mark(s);
  if (s.equity <= s.initial*(1-RULES.dailyLoss)) { s.killed=true; s.running=false; }
  for (const p of [...s.positions]) {
    const change=p.mark/p.entry-1;
    const reason: Reason | null = s.lifecycle?.status === "stopping" ? "manual" : s.killed ? "kill" : minute>=920 ? "close" : change<=-RULES.stop ? "stop" : change>=RULES.target ? "target" : null;
    if (reason) sell(s,p.ticker,reason);
  }
  if (minute>=920) s.running=false;
  if (!hasCandidates(s.candidates)) s.running=false;
  if (s.running && !s.killed && minute>=550 && minute<900) for (const q of quotes) {
    if (s.positions.length>=RULES.maxPositions) break;
    if (!s.candidates.rows.some(c=>c.ticker===q.ticker) || s.positions.some(p=>p.ticker===q.ticker) || (s.cooldown[q.ticker]??0)>s.tick || !validQuote(q) || ![q.price,q.previousHigh,q.volumeRatio,q.spreadBps].every(Number.isFinite) || q.price<=0 || q.previousHigh<=0 || q.spreadBps<0 || q.spreadBps>15 || q.volumeRatio<1.5 || q.price<=q.previousHigh*1.001) continue;
    const price=Math.ceil(q.price*(1+RULES.slippage));
    const quantity=Math.floor(Math.min(s.equity*RULES.allocation/price,s.equity*RULES.risk/(price*(RULES.stop+RULES.fee*2+RULES.sellTax+RULES.slippage)),s.cash/(price*(1+RULES.fee))));
    if (quantity<1) continue;
    const fee=Math.ceil(quantity*price*RULES.fee);
    s.cash-=quantity*price+fee;
    s.positions.push({ticker:q.ticker,quantity,entry:price,mark:q.price});
    s.trades.push({id:`${s.tick}-${q.ticker}-buy`,minute, ticker:q.ticker,side:"buy",quantity,price,fee,reason:"breakout",net:null});
  }
  mark(s);
  finishSession(s);
  // UI snapshot is bounded; worker append-only journal retains the complete ledger.
  s.trades=s.trades.slice(-2000);
}
