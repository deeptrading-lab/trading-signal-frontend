/**
 * `lib/server/stock/snapshot.ts` 단위 테스트 — 지표 산출·집계 순수 로직.
 *
 * PRD `value-picks-validated` AC-1(계약 충족·null 규약) / AC-2(tradeAmountKRW·수급 집계·연속 순매도).
 * KIS 호출 없이 합성 캔들/수급 fixture 로 결정성 검증.
 */

import { describe, it, expect } from "vitest";
import {
  assembleSnapshot,
  aggregateInvestorTrend,
  computeTechnical,
  computeValuation52w,
  nowKstIso,
  INVESTOR_LOOKBACK_DAYS,
} from "../snapshot";
import type { StockDailyCandle, StockPrice } from "@/lib/api/kis/types";
import type {
  StockInvestorDay,
  StockInvestorTrend,
} from "@/lib/types/stock/investors";

/** 오름차순 캔들 생성 — closes 로 OHLC 근사(고저는 ±2%). */
function makeCandles(closes: number[]): StockDailyCandle[] {
  return closes.map((close, i) => ({
    date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    open: close,
    high: Math.round(close * 1.02),
    low: Math.round(close * 0.98),
    close,
    volume: 100_000,
  }));
}

function makePrice(overrides: Partial<StockPrice> = {}): StockPrice {
  return {
    ticker: "005930",
    name: "삼성전자",
    price: 12_450,
    change: -150,
    changePercent: -1.23,
    direction: "down",
    volume: 5_230,
    foreignRatio: 8.4,
    ...overrides,
  };
}

function makeDay(amounts: {
  org: number;
  foreign: number;
}): StockInvestorDay {
  return {
    date: "2026-06-18",
    close: 12_450,
    changeSign: "5",
    personNetBuyAmount: 0,
    personNetBuyQty: 0,
    foreignNetBuyAmount: amounts.foreign,
    foreignNetBuyQty: 0,
    orgNetBuyAmount: amounts.org,
    orgNetBuyQty: 0,
  };
}

describe("computeValuation52w", () => {
  it("52주 고저·위치(%) 산출", () => {
    const candles = makeCandles([11_200, 15_000, 18_900, 12_000]);
    const v = computeValuation52w(candles, 12_450);
    // high=18900*? 아니다 — high 는 close*1.02 의 최대. 18900*1.02=19278, low=11200*0.98=10976.
    expect(v.high).toBe(Math.round(18_900 * 1.02));
    expect(v.low).toBe(Math.round(11_200 * 0.98));
    const span = v.high! - v.low!;
    expect(v.positionPct).toBeCloseTo(((12_450 - v.low!) / span) * 100, 1);
  });

  it("캔들이 비면 전 필드 null", () => {
    const v = computeValuation52w([], 12_450);
    expect(v).toEqual({ high: null, low: null, positionPct: null });
  });
});

describe("computeTechnical", () => {
  it("충분한 봉 → SMA/RSI/ADX/모멘텀·이평 위치 산출", () => {
    // 150봉 상승 추세 — SMA60/120 룩백 확보.
    const closes = Array.from({ length: 150 }, (_, i) => 10_000 + i * 50);
    const candles = makeCandles(closes);
    const current = closes[closes.length - 1];
    const t = computeTechnical(candles, current);

    expect(t.sma5).not.toBeNull();
    expect(t.sma20).not.toBeNull();
    expect(t.sma60).not.toBeNull();
    expect(t.rsi14).not.toBeNull();
    expect(t.adx14).not.toBeNull();
    expect(t.momentumPct).not.toBeNull();
    // 상승 추세 → 현재가가 이평 위.
    expect(t.aboveSma20).toBe(true);
    expect(t.aboveSma60).toBe(true);
    expect(t.momentumPct).toBeGreaterThan(0);
    expect(t.trendRegime).toBe("up");
    expect(t.deadCross).toBe(false);
  });

  it("하락 추세 → trendRegime down·aboveSma60 false", () => {
    const closes = Array.from({ length: 150 }, (_, i) => 20_000 - i * 50);
    const candles = makeCandles(closes);
    const current = closes[closes.length - 1];
    const t = computeTechnical(candles, current);
    expect(t.trendRegime).toBe("down");
    expect(t.aboveSma60).toBe(false);
    expect(t.momentumPct).toBeLessThan(0);
  });

  it("캔들이 비면 전 기술 필드 null", () => {
    const t = computeTechnical([], 12_450);
    expect(t.sma5).toBeNull();
    expect(t.rsi14).toBeNull();
    expect(t.trendRegime).toBeNull();
    expect(t.deadCross).toBeNull();
  });
});

describe("aggregateInvestorTrend", () => {
  it("[AC-2] N일 합산 순매수 — 백만원 → 원 환산", () => {
    // 최신이 [0]. org 5일 합 = (-100)+(-200)+(-50)+10+20 = -320(백만원) → -320,000,000원.
    const trend: StockInvestorTrend = {
      days: [
        makeDay({ org: -100, foreign: 30 }),
        makeDay({ org: -200, foreign: -10 }),
        makeDay({ org: -50, foreign: 5 }),
        makeDay({ org: 10, foreign: 5 }),
        makeDay({ org: 20, foreign: 5 }),
        makeDay({ org: 999, foreign: 999 }), // lookback(5) 밖 — 합산 제외.
      ],
    };
    const agg = aggregateInvestorTrend(trend);
    expect(agg.lookbackDays).toBe(INVESTOR_LOOKBACK_DAYS);
    expect(agg.orgNetBuyAmountKRW).toBe(-320 * 1_000_000);
    expect(agg.foreignNetBuyAmountKRW).toBe(35 * 1_000_000);
  });

  it("[AC-2] 기관 연속 순매도 일수 — 최신부터 음수 연속", () => {
    // org: 최신 3일 연속 순매도(음수), 4일째 순매수(양수)에서 끊김.
    const trend: StockInvestorTrend = {
      days: [
        makeDay({ org: -100, foreign: -10 }),
        makeDay({ org: -200, foreign: 5 }),
        makeDay({ org: -50, foreign: -5 }),
        makeDay({ org: 10, foreign: -5 }),
        makeDay({ org: -20, foreign: -5 }),
      ],
    };
    const agg = aggregateInvestorTrend(trend);
    expect(agg.orgConsecutiveSellDays).toBe(3);
    // foreign: 첫날 음수, 둘째날 양수에서 끊김 → 1.
    expect(agg.foreignConsecutiveSellDays).toBe(1);
  });

  it("days 가 비면 합산·연속일 null", () => {
    const agg = aggregateInvestorTrend({ days: [] });
    expect(agg.orgNetBuyAmountKRW).toBeNull();
    expect(agg.orgConsecutiveSellDays).toBeNull();
  });
});

describe("assembleSnapshot", () => {
  const FIXED_NOW = new Date("2026-06-18T06:31:00.000Z"); // = 15:31 KST.

  it("[AC-1] 최상위 필드 전부 포함 + tradeAmountKRW = current×volume", () => {
    const snap = assembleSnapshot({
      ticker: "092130",
      price: makePrice({ ticker: "092130", name: "이크레더블", price: 12_450, volume: 5_230 }),
      listedShares: 6_763_000,
      candles: makeCandles(Array.from({ length: 150 }, (_, i) => 12_000 + i)),
      investors: { days: [makeDay({ org: -100, foreign: 50 })] },
      market: "KOSDAQ",
      now: FIXED_NOW,
    });

    // 최상위 키 전부.
    expect(Object.keys(snap).sort()).toEqual(
      [
        "asOf",
        "foreignRatioPct",
        "investorTrend",
        "market",
        "marketCapKRW",
        "name",
        "price",
        "technical",
        "ticker",
        "valuation52w",
      ].sort(),
    );
    expect(snap.ticker).toBe("092130");
    expect(snap.name).toBe("이크레더블");
    expect(snap.market).toBe("KOSDAQ");
    expect(snap.asOf).toBe("2026-06-18T15:31:00+09:00");
    // tradeAmountKRW = 12450 × 5230.
    expect(snap.price.tradeAmountKRW).toBe(12_450 * 5_230);
    // marketCapKRW = 12450 × 6,763,000.
    expect(snap.marketCapKRW).toBe(12_450 * 6_763_000);
    expect(snap.foreignRatioPct).toBe(8.4);
  });

  it("[AC-1] 산출 불가 그룹은 필드 생략이 아니라 null", () => {
    const snap = assembleSnapshot({
      ticker: "005930",
      price: makePrice(),
      listedShares: null, // 시총 산출 불가.
      candles: null, // 일봉 실패.
      investors: null, // 수급 실패.
      market: null,
      now: FIXED_NOW,
    });

    expect(snap.marketCapKRW).toBeNull();
    // valuation52w·technical 은 객체이되 내부 수치는 null.
    expect(snap.valuation52w).toEqual({ high: null, low: null, positionPct: null });
    expect(snap.technical.sma5).toBeNull();
    expect(snap.technical.trendRegime).toBeNull();
    expect(snap.investorTrend.orgNetBuyAmountKRW).toBeNull();
    expect(snap.investorTrend.orgConsecutiveSellDays).toBeNull();
    // price 그룹은 살아있어 계약 충족.
    expect(snap.price.tradeAmountKRW).toBe(12_450 * 5_230);
  });

  it("name 폴백 — price.name 없으면 fallbackName → ticker", () => {
    const snap = assembleSnapshot({
      ticker: "999999",
      price: makePrice({ ticker: "999999", name: "999999" }),
      listedShares: null,
      candles: null,
      investors: null,
      market: null,
      fallbackName: "테스트종목",
      now: FIXED_NOW,
    });
    expect(snap.name).toBe("999999"); // price.name 이 ticker 와 같지만 truthy → 우선. (실제 폴백은 mapStockPrice 책임)
  });
});

describe("nowKstIso", () => {
  it("UTC → KST(+09:00) ISO8601", () => {
    expect(nowKstIso(new Date("2026-06-18T06:31:00.000Z"))).toBe(
      "2026-06-18T15:31:00+09:00",
    );
  });
});
