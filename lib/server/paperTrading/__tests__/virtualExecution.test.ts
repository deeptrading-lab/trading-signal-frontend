import { describe, expect, it } from "vitest";
import { executeVirtualTrade } from "@/lib/server/paperTrading/virtualExecution";
import type {
  PaperTradingDecision,
  PaperTradingPosition,
  PaperTradingPriceSnapshot,
} from "@/lib/types/paperTrading/paperTrading";

const price: PaperTradingPriceSnapshot = {
  ticker: "005930",
  name: "삼성전자",
  price: 100,
  changePct: 0,
  asOf: "2026-06-24T00:00:00.000Z",
  freshnessSeconds: 10,
};

const buyDecision: PaperTradingDecision = {
  action: "BUY",
  targetAllocationPct: 100,
  targetAllocations: [
    {
      ticker: "005930",
      name: "삼성전자",
      targetAllocationPct: 100,
      rationale: "테스트 매수",
    },
  ],
  confidence: "HIGH",
  rationale: "테스트 매수",
  riskNotes: [],
  source: "mock",
};

describe("executeVirtualTrade", () => {
  it("목표 비중이 최대 비중을 넘으면 주문 크기를 줄인다", () => {
    const result = executeVirtualTrade({
      cash: 100,
      positions: [],
      decision: buyDecision,
      priceSnapshot: [price],
      maxPositionPct: 50,
      cashBufferPct: 10,
    });

    expect(result.positions[0]?.allocationPct).toBeLessThanOrEqual(50);
    expect(result.cash).toBeGreaterThanOrEqual(10);
    expect(result.guardAdjustments.length).toBeGreaterThan(0);
  });

  it("EXIT은 가상 포지션을 정리한다", () => {
    const position: PaperTradingPosition = {
      ticker: "005930",
      name: "삼성전자",
      quantity: 0.3,
      avgEntryPrice: 100,
      lastPrice: 100,
      marketValue: 30,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      allocationPct: 30,
      updatedAt: price.asOf,
    };

    const result = executeVirtualTrade({
      cash: 70,
      positions: [position],
      decision: {
        ...buyDecision,
        action: "EXIT",
        targetAllocationPct: 0,
        targetAllocations: [
          {
            ticker: "005930",
            name: "삼성전자",
            targetAllocationPct: 0,
            rationale: "테스트 청산",
          },
        ],
      },
      priceSnapshot: [price],
      maxPositionPct: 50,
      cashBufferPct: 10,
    });

    expect(result.positions).toHaveLength(0);
    expect(result.cash).toBe(100);
  });

  it("여러 종목의 목표 비중을 동시에 맞춘다", () => {
    const result = executeVirtualTrade({
      cash: 100,
      positions: [],
      decision: {
        ...buyDecision,
        targetAllocationPct: 60,
        targetAllocations: [
          {
            ticker: "005930",
            name: "삼성전자",
            targetAllocationPct: 30,
            rationale: "삼성전자 배분",
          },
          {
            ticker: "000660",
            name: "SK하이닉스",
            targetAllocationPct: 30,
            rationale: "SK하이닉스 배분",
          },
        ],
      },
      priceSnapshot: [
        price,
        {
          ticker: "000660",
          name: "SK하이닉스",
          price: 100,
          changePct: 0,
          asOf: price.asOf,
          freshnessSeconds: 10,
        },
      ],
      maxPositionPct: 50,
      cashBufferPct: 10,
    });

    expect(result.positions.map((position) => position.name).sort()).toEqual([
      "SK하이닉스",
      "삼성전자",
    ]);
    expect(result.positions.reduce((sum, position) => sum + position.allocationPct, 0)).toBe(60);
  });
});
