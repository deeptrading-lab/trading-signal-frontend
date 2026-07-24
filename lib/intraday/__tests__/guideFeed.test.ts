import { describe, expect, it } from "vitest";
import { buildGuideHoldings, buildIntradayGuideItems } from "@/lib/intraday/guideFeed";
import type { AutopilotRun } from "@/lib/types/paperTrading/autopilot";
import type { PaperTradingSessionDetail } from "@/lib/types/paperTrading/paperTrading";

const now = "2026-07-13T01:00:00.000Z";

function run(over: Partial<AutopilotRun> = {}): AutopilotRun {
  return {
    id: "run-1",
    status: "active",
    owner: "me",
    totalCapital: 10_000_000,
    slotCount: 1,
    perSlotCash: 10_000_000,
    riskMode: "balanced",
    slots: [],
    cooldownUntilByTicker: {},
    rotationLog: [],
    lastSweepWindowStart: null,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function detail(side: "BUY" | "SELL"): PaperTradingSessionDetail {
  return {
    session: {
      id: "session-1",
      name: "가이드",
      status: "running",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자" }],
      initialCash: 10_000_000,
      targetReturnPct: 5,
      cash: 10_000_000,
      portfolioValue: 10_000_000,
      returnPct: 0,
      riskMode: "balanced",
      maxPositionPct: 50,
      cashBufferPct: 10,
      tickIntervalMinutes: 5,
      decisionProvider: "cli-agent",
      autopilotRunId: "run-1",
      mode: "live-paper",
      lastTickWindowStart: now,
      startedAt: now,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    positions: [],
    equityCurve: [],
    latestDecision: null,
    ticks: [
      {
        id: `tick-${side}`,
        sessionId: "session-1",
        tickIndex: 1,
        status: "executed",
        triggeredBy: "auto",
        tickWindowStart: now,
        pricedAt: now,
        priceFreshnessSeconds: 0,
        portfolioValueBefore: 10_000_000,
        portfolioValueAfter: 10_000_000,
        cashBefore: 10_000_000,
        cashAfter: 10_000_000,
        returnPctAfter: 0,
        decision: {
          action: side,
          targetAllocationPct: side === "BUY" ? 50 : 0,
          targetAllocations: [],
          confidence: "HIGH",
          rationale: "테스트",
          riskNotes: [],
          source: "cli-agent",
        },
        priceSnapshot: [],
        orders: [{ ticker: "005930", name: "삼성전자", side, quantity: 10, price: 70_000, notional: 700_000, reason: "테스트" }],
        rationale: "테스트",
        guardAdjustments: [],
        errorMessage: null,
        createdAt: now,
      },
    ],
  };
}

describe("AI 단타 가이드 피드", () => {
  it("사용자 수행 매수가 없으면 가상 SELL 주문을 행동 알림에서 제외한다", () => {
    expect(buildIntradayGuideItems(run(), [detail("SELL")])).toEqual([]);
  });

  it("같은 종목의 최신 원본이 SELL이면 그보다 오래된 미응답 BUY도 만료한다", () => {
    const buy = detail("BUY");
    buy.ticks[0].createdAt = "2026-07-13T00:50:00.000Z";
    const sellTick = detail("SELL").ticks[0];
    sellTick.sessionId = buy.session.id;
    buy.ticks.push(sellTick);
    expect(buildIntradayGuideItems(run(), [buy])).toEqual([]);
  });

  it("수행 응답만 보유량에 반영하고 패스는 제외한다", () => {
    const responses = {
      buy: {
        guideId: "buy",
        sessionId: "session-1",
        tickId: "tick-BUY",
        orderIndex: 0,
        ticker: "005930",
        name: "삼성전자",
        side: "BUY" as const,
        recommendedPrice: 70_000,
        recommendedQuantity: 10,
        recommendedAt: now,
        executedQuantity: 10,
        response: "performed" as const,
        respondedAt: now,
      },
      passed: {
        guideId: "passed",
        sessionId: "session-1",
        tickId: "tick-2",
        orderIndex: 0,
        ticker: "000660",
        name: "SK하이닉스",
        side: "BUY" as const,
        recommendedPrice: 100_000,
        recommendedQuantity: 5,
        recommendedAt: now,
        executedQuantity: 0,
        response: "passed" as const,
        respondedAt: now,
      },
    };
    expect(buildGuideHoldings(responses)).toEqual([
      { ticker: "005930", name: "삼성전자", quantity: 10, averagePrice: 70_000 },
    ]);
    expect(buildIntradayGuideItems(run({ guideResponses: responses }), [detail("SELL")])[0]).toMatchObject({
      side: "SELL",
      quantity: 10,
      status: "pending",
    });
  });
});
