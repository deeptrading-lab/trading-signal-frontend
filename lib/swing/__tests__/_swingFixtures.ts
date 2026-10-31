/**
 * 스윙 판정 테스트 픽스처 — 종가 배열 → SwingInput. (`.test.ts` 아님 → 테스트 수집 제외)
 */

import type { InvestorTradeDay } from "@/lib/api/kis/investor-flow";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import { makeCandles, type CandleOpts } from "@/lib/signal/__tests__/_fixtures";
import type { SwingEvent, SwingInput } from "../features";
import type { SwingMarket } from "../rulebook";

type FlowNets = Partial<Omit<InvestorTradeDay, "date" | "tradingValue">>;

/** 봉마다 수급 1행 — 기본 거래대금 100억(원), 순매수 0. `lastN` 봉에만 `nets` 를 넣는다. */
export function makeFlow(
  bars: StockDailyCandle[],
  opts: { tradingValue?: number; nets?: FlowNets; lastN?: number } = {},
): InvestorTradeDay[] {
  const tv = opts.tradingValue ?? 10_000_000_000;
  const lastN = opts.lastN ?? 0;
  return bars.map((b, i) => {
    const active = i >= bars.length - lastN;
    const n = active ? (opts.nets ?? {}) : {};
    return {
      date: b.date,
      tradingValue: tv,
      person: n.person ?? 0,
      foreign: n.foreign ?? 0,
      institution: n.institution ?? 0,
      pension: n.pension ?? 0,
      privateEquity: n.privateEquity ?? 0,
    };
  });
}

export function makeInput(
  closes: number[],
  opts: {
    candle?: CandleOpts;
    ticker?: string;
    name?: string;
    market?: SwingMarket;
    flow?: { tradingValue?: number; nets?: FlowNets; lastN?: number };
    events?: SwingEvent[];
  } = {},
): SwingInput {
  const bars = makeCandles(closes, opts.candle);
  return {
    ticker: opts.ticker ?? "000001",
    name: opts.name ?? "테스트전자",
    market: opts.market ?? "KOSPI",
    bars,
    flow: makeFlow(bars, opts.flow),
    events: opts.events ?? [],
  };
}

/** 잔물결 평탄 구간 — 진폭 amp 사인파. 지표가 0/100 에 박히지 않게 한다. */
export function flatCloses(level: number, count: number, amp = 20): number[] {
  return Array.from({ length: count }, (_, i) => level + amp * Math.sin(i * 0.5));
}

/** a → b 선형(양 끝 포함하지 않는 count 개). */
export function ramp(a: number, b: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => a + ((b - a) * (i + 1)) / count);
}
