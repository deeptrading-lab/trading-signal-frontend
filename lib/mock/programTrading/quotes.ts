import type { Quote } from "@/lib/types/programTrading/programTrading";
// Candidate membership comes from rankings. Only the subsequent prices are synthetic.
// No hard-coded fallback symbols: an empty universe produces no quotes.
export function mockQuotes(tick: number, universe: {ticker: string; name: string; price: number}[] = []): Quote[] {
  return universe.map(({ticker,name,price:base}) => {
    const phase = Number(ticker) % 17;
    const wave = (t: number) => 1 + Math.sin((t + phase) / 5) * .018 + Math.sin(t / 17) * .009;
    const price = Math.round(base * wave(tick));
    return { ticker, name, price, previousHigh: Math.max(...[1,2,3].map(n => Math.round(base * wave(tick-n)))), volumeRatio: tick % 7 === 0 ? .8 : 1.8, spreadBps: 8, ageMs: 0, halted: false };
  });
}
