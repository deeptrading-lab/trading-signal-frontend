import { describe, expect, it } from "vitest";
import {
  createPaperTradingSession,
  resetPaperTradingStoreForTest,
  runPaperTradingSessionTick,
} from "@/lib/server/paperTrading/sessionStore";

describe("paper trading session store", () => {
  it("세션 생성 시 첫 tick과 자산곡선을 만든다", () => {
    resetPaperTradingStoreForTest();
    const detail = createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 100,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    });

    expect(detail.session.portfolioValue).toBe(100);
    expect(detail.ticks).toHaveLength(1);
    expect(detail.positions[0]?.allocationPct).toBeLessThanOrEqual(50);
    expect(detail.equityCurve.map((point) => point.value)).toEqual([100, 100]);
  });

  it("tick 추가 시 이전 tick은 보존하고 새 tick을 append 한다", () => {
    resetPaperTradingStoreForTest();
    const detail = createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 100,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    });
    const firstTickId = detail.ticks[0]?.id;

    const next = runPaperTradingSessionTick(detail.session.id, { triggeredBy: "user" });

    expect(next?.ticks).toHaveLength(2);
    expect(next?.ticks[0]?.id).toBe(firstTickId);
    expect(next?.equityCurve.length).toBe(3);
  });

  it("같은 tick window 요청은 중복 tick을 만들지 않는다", () => {
    resetPaperTradingStoreForTest();
    const detail = createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 100,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    });
    const window = detail.session.lastTickWindowStart ?? "";

    const duplicated = runPaperTradingSessionTick(detail.session.id, {
      triggeredBy: "user",
      tickWindowStart: window,
    });

    expect(duplicated?.ticks).toHaveLength(1);
  });

  it("여러 종목을 종목명과 함께 세션에 보존하고 첫 tick에서 분산 배분한다", () => {
    resetPaperTradingStoreForTest();
    const detail = createPaperTradingSession({
      name: "테스트",
      tickers: ["005930", "000660"],
      stocks: [
        { ticker: "005930", name: "삼성전자", market: "KOSPI" },
        { ticker: "000660", name: "SK하이닉스", market: "KOSPI" },
      ],
      initialCash: 100,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    });

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
