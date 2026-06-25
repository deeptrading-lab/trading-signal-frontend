import { describe, expect, it } from "vitest";
import {
  createPaperTradingSession,
  resetPaperTradingStoreForTest,
  runPaperTradingSessionTick,
} from "@/lib/server/paperTrading/sessionStore";
import type { PaperTradingPriceSnapshotProvider } from "@/lib/server/paperTrading/marketData";

const testPriceProvider: PaperTradingPriceSnapshotProvider = async (
  stocks,
  tickIndex,
  tickWindowStart,
) =>
  stocks.map((stock, index) => ({
    ticker: stock.ticker,
    name: stock.name,
    price: 100_000 + tickIndex * 1_000 + index * 10_000,
    changePct: tickIndex === 0 ? 0 : 1,
    asOf: tickWindowStart,
    freshnessSeconds: 0,
  }));

describe("paper trading session store", () => {
  it("세션 생성 시 첫 tick과 자산곡선을 만든다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });

    expect(detail.session.portfolioValue).toBe(1_000_000);
    expect(detail.session.mode).toBe("live-paper");
    expect(detail.session.decisionProvider).toBe("mock");
    expect(detail.ticks).toHaveLength(1);
    expect(detail.positions[0]?.allocationPct).toBeLessThanOrEqual(50);
    expect(Number.isInteger(detail.positions[0]?.quantity)).toBe(true);
    expect(detail.equityCurve.map((point) => point.value)).toEqual([1_000_000, 1_000_000]);
  });

  it("tick 추가 시 이전 tick은 보존하고 새 tick을 append 한다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });
    const firstTickId = detail.ticks[0]?.id;

    const next = await runPaperTradingSessionTick(detail.session.id, {
      triggeredBy: "user",
      priceSnapshotProvider: testPriceProvider,
    });

    expect(next?.ticks).toHaveLength(2);
    expect(next?.ticks[0]?.id).toBe(firstTickId);
    expect(next?.equityCurve.length).toBe(3);
  });

  it("같은 tick window 요청은 중복 tick을 만들지 않는다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });
    const window = detail.session.lastTickWindowStart ?? "";

    const duplicated = await runPaperTradingSessionTick(detail.session.id, {
      triggeredBy: "user",
      tickWindowStart: window,
      priceSnapshotProvider: testPriceProvider,
    });

    expect(duplicated?.ticks).toHaveLength(1);
  });

  it("여러 종목을 종목명과 함께 세션에 보존하고 첫 tick에서 분산 배분한다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930", "000660"],
      stocks: [
        { ticker: "005930", name: "삼성전자", market: "KOSPI" },
        { ticker: "000660", name: "SK하이닉스", market: "KOSPI" },
      ],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });

    expect(detail.session.stocks.map((stock) => stock.name)).toEqual([
      "삼성전자",
      "SK하이닉스",
    ]);
    expect(detail.positions.map((position) => position.name).sort()).toEqual([
      "SK하이닉스",
      "삼성전자",
    ]);
    expect(detail.latestDecision?.targetAllocations).toHaveLength(2);
  });
});
