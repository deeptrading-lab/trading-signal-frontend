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
  price: 100_000,
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
      cash: 1_000_000,
      positions: [],
      decision: buyDecision,
      priceSnapshot: [price],
      maxPositionPct: 50,
      cashBufferPct: 10,
    });

    expect(result.positions[0]?.allocationPct).toBeLessThanOrEqual(50);
    expect(result.cash).toBeGreaterThanOrEqual(100_000);
    expect(result.guardAdjustments.length).toBeGreaterThan(0);
    expect(Number.isInteger(result.positions[0]?.quantity)).toBe(true);
  });

  it("EXIT은 가상 포지션을 정리한다", () => {
    const position: PaperTradingPosition = {
      ticker: "005930",
      name: "삼성전자",
      quantity: 3,
      avgEntryPrice: 100_000,
      lastPrice: 100_000,
      marketValue: 300_000,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      allocationPct: 30,
      updatedAt: price.asOf,
    };

    const result = executeVirtualTrade({
      cash: 700_000,
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
    expect(result.cash).toBe(1_000_000);
  });

  it("여러 종목의 목표 비중을 동시에 맞춘다", () => {
    const result = executeVirtualTrade({
      cash: 1_000_000,
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
          price: 100_000,
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

  it("현금이 부족하면 1주 미만 가상 매수를 체결하지 않는다", () => {
    const result = executeVirtualTrade({
      cash: 1_000_000,
      positions: [],
      decision: buyDecision,
      priceSnapshot: [{ ...price, price: 950_000 }],
      maxPositionPct: 100,
      cashBufferPct: 10,
    });

    expect(result.orders).toHaveLength(0);
    expect(result.positions).toHaveLength(0);
    expect(result.cash).toBe(1_000_000);
    expect(result.guardAdjustments.join(" ")).toContain("현금이 부족");
  });
});

describe("executeVirtualTrade forced-exit (단타 청산)", () => {
  const held: PaperTradingPosition = {
    ticker: "005930",
    name: "삼성전자",
    quantity: 3,
    avgEntryPrice: 100_000,
    lastPrice: 100_000,
    marketValue: 300_000,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    allocationPct: 30,
    updatedAt: price.asOf,
  };
  const holdDecision: PaperTradingDecision = {
    action: "HOLD",
    targetAllocationPct: 30,
    targetAllocations: [{ ticker: "005930", name: "삼성전자", targetAllocationPct: 30, rationale: "유지" }],
    confidence: "LOW",
    rationale: "유지",
    riskNotes: [],
    source: "cli-agent",
  };

  it("손절가 이탈 시 HOLD 를 무시하고 강제 청산", () => {
    const result = executeVirtualTrade({
      cash: 700_000,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 96_000 }],
      forcedExit: { stopPrice: 97_000, targetPrice: 110_000, flattenAll: false },
    });
    expect(result.positions).toHaveLength(0);
    expect(result.guardAdjustments.join(" ")).toContain("손절선");
  });

  it("익절 목표가 도달 시 강제 청산", () => {
    const result = executeVirtualTrade({
      cash: 700_000,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 105_000 }],
      forcedExit: { stopPrice: 95_000, targetPrice: 104_000, flattenAll: false },
    });
    expect(result.positions).toHaveLength(0);
    expect(result.guardAdjustments.join(" ")).toContain("익절");
  });

  it("장 막판 flattenAll 이면 가격 무관 전량 청산", () => {
    const result = executeVirtualTrade({
      cash: 700_000,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 100_000 }],
      forcedExit: { stopPrice: 90_000, targetPrice: 120_000, flattenAll: true },
    });
    expect(result.positions).toHaveLength(0);
    expect(result.guardAdjustments.join(" ")).toContain("장 막판");
  });

  it("트리거 미도달이면 원 결정(HOLD) 유지 — 청산 안 함", () => {
    const result = executeVirtualTrade({
      cash: 700_000,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 100_000 }],
      forcedExit: { stopPrice: 95_000, targetPrice: 110_000, flattenAll: false },
    });
    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].quantity).toBe(3);
  });

  it("보유 포지션이 없으면 forcedExit 무시(청산 가드 노트 없음)", () => {
    const flatHold: PaperTradingDecision = {
      ...holdDecision,
      targetAllocationPct: 0,
      targetAllocations: [{ ticker: "005930", name: "삼성전자", targetAllocationPct: 0, rationale: "관망" }],
    };
    const result = executeVirtualTrade({
      cash: 1_000_000,
      positions: [],
      decision: flatHold,
      priceSnapshot: [{ ...price, price: 96_000 }],
      forcedExit: { stopPrice: 97_000, flattenAll: false },
    });
    expect(result.positions).toHaveLength(0);
    expect(result.orders).toHaveLength(0);
    expect(result.guardAdjustments.join(" ")).not.toContain("손절선");
  });
});

describe("executeVirtualTrade 빈 targetAllocations 계약 (리뷰 #1 — HOLD 매도 누수 방지)", () => {
  const held: PaperTradingPosition = {
    ticker: "005930",
    name: "삼성전자",
    quantity: 10,
    avgEntryPrice: 100_000,
    lastPrice: 100_000,
    marketValue: 1_000_000,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    allocationPct: 50,
    updatedAt: price.asOf,
  };

  it("allocations 비면(EXIT 제외) 가격이 올라도 주문을 내지 않는다", () => {
    const result = executeVirtualTrade({
      cash: 1_000_000,
      positions: [held],
      decision: {
        ...buyDecision,
        action: "HOLD",
        targetAllocationPct: 50, // stale 비중이 남아 있어도
        targetAllocations: [],   // 빈 allocations = 리밸런싱 금지.
      },
      priceSnapshot: [{ ...price, price: 100_300 }], // +0.3% 상승 — floor 드리프트 조건.
      maxPositionPct: 50,
      cashBufferPct: 10,
    });
    expect(result.orders).toHaveLength(0);
    expect(result.positions[0]?.quantity).toBe(10);
  });

  it("빈 allocations 여도 forcedExit(손절)는 그대로 발동한다", () => {
    const result = executeVirtualTrade({
      cash: 1_000_000,
      positions: [held],
      decision: {
        ...buyDecision,
        action: "HOLD",
        targetAllocationPct: 50,
        targetAllocations: [],
      },
      priceSnapshot: [{ ...price, price: 96_000 }],
      forcedExit: { stopPrice: 97_000, targetPrice: 110_000, flattenAll: false },
    });
    expect(result.positions).toHaveLength(0);
    expect(result.guardAdjustments.join(" ")).toContain("손절선");
  });
});

describe("executeVirtualTrade 하드스톱 (intraday-stop-slippage B)", () => {
  const held: PaperTradingPosition = {
    ticker: "005930",
    name: "삼성전자",
    quantity: 10,
    avgEntryPrice: 100_000,
    lastPrice: 100_000,
    marketValue: 1_000_000,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    allocationPct: 50,
    updatedAt: price.asOf,
  };
  const holdDecision: PaperTradingDecision = {
    action: "HOLD",
    targetAllocationPct: 0,
    targetAllocations: [],
    confidence: "LOW",
    rationale: "유지",
    riskNotes: [],
    source: "cli-agent",
  };

  it("포지션 손실률이 하드스톱(−5%) 이하면 EXIT — 동적 손절선 미설정이어도 청산", () => {
    const result = executeVirtualTrade({
      cash: 0,
      positions: [held],
      decision: holdDecision,
      // 94,000 = −6% → 하드스톱(−5%) 발동. 동적 손절선(stopPrice)은 미설정.
      priceSnapshot: [{ ...price, price: 94_000 }],
      forcedExit: { stopPrice: null, targetPrice: null, flattenAll: false, positionHardStopPct: -5 },
    });
    expect(result.positions).toHaveLength(0);
    expect(result.guardAdjustments.join(" ")).toContain("포지션 손실 한도(-5%)");
  });

  it("세션 수익률이 세션 하드스톱(−7%) 이하면 전량 flatten", () => {
    const result = executeVirtualTrade({
      cash: 0,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 99_000 }], // 포지션은 −1%(하드스톱 미도달)
      forcedExit: {
        stopPrice: null,
        targetPrice: null,
        flattenAll: false,
        positionHardStopPct: -5,
        sessionHardStopPct: -7,
        sessionReturnPct: -8, // 세션 −8% → 세션 하드스톱 발동
      },
    });
    expect(result.positions).toHaveLength(0);
    expect(result.guardAdjustments.join(" ")).toContain("세션 손실 한도(-7%)");
  });

  it("'끄기'(positionHardStopPct null)면 하드스톱 미발동 — 동적 손절선은 그대로 작동", () => {
    // 끄기 + 동적 손절선 있음: 손절선 이탈은 여전히 청산.
    const withStop = executeVirtualTrade({
      cash: 0,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 96_000 }],
      forcedExit: { stopPrice: 97_000, targetPrice: null, flattenAll: false, positionHardStopPct: null },
    });
    expect(withStop.positions).toHaveLength(0);
    expect(withStop.guardAdjustments.join(" ")).toContain("손절선");

    // 끄기 + 동적 손절선 없음: −6% 급락이어도 하드스톱이 꺼져 있어 청산하지 않는다.
    const noStop = executeVirtualTrade({
      cash: 0,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 94_000 }],
      forcedExit: { stopPrice: null, targetPrice: null, flattenAll: false, positionHardStopPct: null },
    });
    expect(noStop.positions).toHaveLength(1);
    expect(noStop.guardAdjustments.join(" ")).not.toContain("손실 한도");
  });

  it("정상(급락 없음) 흐름에서는 하드스톱 미발동 — 무주문(AC-5 회귀 0)", () => {
    const result = executeVirtualTrade({
      cash: 0,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 101_000 }], // +1%
      forcedExit: { stopPrice: 90_000, targetPrice: 120_000, flattenAll: false, positionHardStopPct: -5, sessionHardStopPct: -7, sessionReturnPct: 1 },
    });
    expect(result.positions).toHaveLength(1);
    expect(result.orders).toHaveLength(0);
  });

  it("관측성(AC-7) — 손절 청산 시 설정 손절선 vs 실체결가 갭을 guardAdjustments 에 기록", () => {
    const result = executeVirtualTrade({
      cash: 0,
      positions: [held],
      decision: holdDecision,
      priceSnapshot: [{ ...price, price: 95_000 }],
      // 슬리피지 10bp → 매도 체결가 95,000×(1−0.001)=94,905. 손절선 97,000 대비 갭 기록.
      forcedExit: { stopPrice: 97_000, targetPrice: null, flattenAll: false, positionHardStopPct: -5 },
      costs: { feeBpPerSide: 0, sellTaxBp: 0, slippageBp: 10 },
    });
    const note = result.guardAdjustments.join(" ");
    expect(note).toContain("손절선 97,000원 대비 실체결 94,905원");
    expect(note).toMatch(/대비 실체결/);
  });
});

describe("executeVirtualTrade 거래 비용 모델 (단타 cli-agent)", () => {
  // 검산 쉬운 값: 수수료 10bp/편도, 매도 제세금 20bp, 슬리피지 10bp/편도.
  const costs = { feeBpPerSide: 10, sellTaxBp: 20, slippageBp: 10 };

  it("매수 — 슬리피지 반영 체결가 + 수수료 현금 차감", () => {
    const result = executeVirtualTrade({
      cash: 1_000_000,
      positions: [],
      decision: buyDecision,
      priceSnapshot: [price],
      maxPositionPct: 50,
      cashBufferPct: 10,
      costs,
    });

    const order = result.orders[0];
    // 체결가 = 100,000 × (1 + 0.001) = 100,100 (매수는 위로).
    expect(order?.price).toBe(100_100);
    expect(order?.quantity).toBe(5);
    // 수수료 = 500,500 × 0.001 = 501 (반올림).
    expect(order?.costKrw).toBe(501);
    // 현금 = 1,000,000 − 500,500(체결) − 501(수수료).
    expect(result.cash).toBe(498_999);
    // 평단은 체결가 기준.
    expect(result.positions[0]?.avgEntryPrice).toBe(100_100);
  });

  it("청산 — 슬리피지 아래 체결 + 수수료·제세금 차감", () => {
    const held: PaperTradingPosition = {
      ticker: "005930",
      name: "삼성전자",
      quantity: 5,
      avgEntryPrice: 100_000,
      lastPrice: 100_000,
      marketValue: 500_000,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      allocationPct: 50,
      updatedAt: price.asOf,
    };
    const result = executeVirtualTrade({
      cash: 0,
      positions: [held],
      decision: {
        ...buyDecision,
        action: "EXIT",
        targetAllocationPct: 0,
        targetAllocations: [
          { ticker: "005930", name: "삼성전자", targetAllocationPct: 0, rationale: "청산" },
        ],
      },
      priceSnapshot: [price],
      maxPositionPct: 50,
      cashBufferPct: 0,
      costs,
    });

    const order = result.orders[0];
    // 체결가 = 100,000 × (1 − 0.001) = 99,900 (매도는 아래로).
    expect(order?.price).toBe(99_900);
    // 수수료 499.5 + 제세금 999 = 1,498.5 → 1,499.
    expect(order?.costKrw).toBe(1_499);
    // 현금 = 499,500(체결) − 1,499(비용).
    expect(result.cash).toBe(498_001);
    expect(result.positions).toHaveLength(0);
  });

  it("costs 미주입이면 비용 0 — 체결가·현금 기존 동작 그대로", () => {
    const result = executeVirtualTrade({
      cash: 1_000_000,
      positions: [],
      decision: buyDecision,
      priceSnapshot: [price],
      maxPositionPct: 50,
      cashBufferPct: 10,
    });

    const order = result.orders[0];
    expect(order?.price).toBe(100_000);
    expect(order?.costKrw).toBe(0);
    expect(result.cash).toBe(1_000_000 - (order?.notional ?? 0));
  });
});
