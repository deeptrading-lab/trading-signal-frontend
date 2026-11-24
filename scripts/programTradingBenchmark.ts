import { performance } from "node:perf_hooks";
import { buyCandidates, initialState, observePrices, startSession } from "../lib/server/programTrading/engine";

const start = performance.now();
const runs = 300;
let trades = 0;
const now = Date.now();
const date = new Date(now).toISOString();
for (let run = 0; run < runs; run++) {
  const state = initialState(now);
  startSession(state, now, now);
  buyCandidates(state, {
    status: "ready", checkedAt: date, expiresAt: date,
    rows: [{ ticker: "005930", name: "benchmark", price: 70_000, changePercent: 1, previousClose: 60_000, sources: ["volume"], rank: 1, volume: 1_000_000 }],
  }, now);
  observePrices(state, new Map([["005930", { price: 72_000, at: now + 300_000 }]]), now + 300_000);
  trades += state.trades.length;
}
console.log(JSON.stringify({ runs, trades, totalMs: performance.now() - start, scope: "One synthetic buy and exit per run, excluding IO and provider latency" }));
