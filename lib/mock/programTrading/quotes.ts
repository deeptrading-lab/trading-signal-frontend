import type { Quote } from "@/lib/types/programTrading/programTrading";
// Candidate membership comes from rankings. Only the subsequent prices are synthetic.
// No hard-coded fallback symbols: an empty universe produces no quotes.
export function mockQuotes(tick: number, universe: {ticker: string; name: string; price: number}[] = [], now = Date.now()): Quote[] {
  return universe.map(({ticker,name,price:base}) => {
    const phase = Number(ticker) % 17;
    const wave = (t: number) => 1 + Math.sin((t + phase) / 5) * .018 + Math.sin(t / 17) * .009;
    const price = Math.round(base * wave(tick));
    const previous = Math.round(base * wave(tick - 1));
    const previousHigh = Math.max(...[1,2,3].map(n => Math.round(base * wave(tick-n))));
    const volumeRatio = tick % 7 === 0 ? .8 : 1.8;
    return {
      ticker, name, price, previousHigh, volumeRatio, spreadBps: 3, ageMs: 0, halted: false,
      bid: price, ask: price * 1.0003, bidQty: 10000, askQty: 10000,
      signal: { closedAt: Math.floor(now / 60000) * 60000, open: previous,
        high: Math.max(price, previous), low: Math.min(price, previous),
        close: price, previousHigh, volumeRatio },
    };
  });
}
