import {
  PAPER_TRADING_POSITION_HARD_STOP_PCT,
} from "@/lib/server/paperTrading/constants";
import type {
  PaperTradingDecision,
  PaperTradingPosition,
  PaperTradingPriceSnapshot,
  PaperTradingRiskMode,
} from "@/lib/types/paperTrading/paperTrading";

export type MockDecisionInput = {
  positions: PaperTradingPosition[];
  priceSnapshot: PaperTradingPriceSnapshot[];
  portfolioValue: number;
  returnPct: number;
  riskMode: PaperTradingRiskMode;
  maxPositionPct: number;
};

export function decideWithMockProvider(input: MockDecisionInput): PaperTradingDecision {
  const totalTarget = riskAdjustedEntry(input.riskMode);
  const allocations = allocateByMomentum(input, totalTarget);
  const worstPosition = input.positions.find(
    (position) => position.unrealizedPnlPct <= PAPER_TRADING_POSITION_HARD_STOP_PCT,
  );

  if (worstPosition) {
    return {
      action: "EXIT",
      targetAllocationPct: 0,
      targetAllocations: input.priceSnapshot.map((price) => ({
        ticker: price.ticker,
        name: price.name,
        targetAllocationPct: 0,
        rationale: `${worstPosition.name} 손실 제한 기준에 닿아 전체 가상 비중을 줄입니다.`,
      })),
      confidence: "HIGH",
      rationale: "손실 제한 기준에 닿아 가상 포지션을 정리합니다.",
      riskNotes: ["포지션 손실률이 -5% 이하로 내려갔어요."],
      expectedHoldingMinutes: 0,
      invalidationPrice: null,
      source: "mock",
    };
  }

  if (input.positions.length === 0) {
    return {
      action: "BUY",
      targetAllocationPct: sumAllocations(allocations),
      targetAllocations: allocations,
      confidence: "MEDIUM",
      rationale: "모의 세션의 첫 판단으로 종목별 목표 비중을 나눠 가상 진입합니다.",
      riskNotes: ["초기 진입은 종목별 최대 비중과 현금 버퍼를 지키며 배분합니다."],
      expectedHoldingMinutes: 60,
      invalidationPrice: null,
      source: "mock",
    };
  }

  const averageChange =
    input.priceSnapshot.reduce((sum, price) => sum + price.changePct, 0) /
    Math.max(1, input.priceSnapshot.length);

  if (averageChange <= -2) {
    return {
      action: "REDUCE",
      targetAllocationPct: sumAllocations(allocations),
      targetAllocations: allocations,
      confidence: "MEDIUM",
      rationale: "평균 가격 흐름이 약해져 종목별 가상 비중을 낮춰 배분합니다.",
      riskNotes: ["30분 평균 가격 변화가 -2% 이하예요."],
      expectedHoldingMinutes: 30,
      invalidationPrice: null,
      source: "mock",
    };
  }

  if (averageChange >= 2) {
    return {
      action: "INCREASE",
      targetAllocationPct: sumAllocations(allocations),
      targetAllocations: allocations,
      confidence: "MEDIUM",
      rationale: "평균 가격 흐름이 강해 강한 종목에 가상 비중을 더 배분합니다.",
      riskNotes: ["종목별 최대 비중 한도 안에서만 확대합니다."],
      expectedHoldingMinutes: 60,
      invalidationPrice: null,
      source: "mock",
    };
  }

  return {
    action: "HOLD",
    targetAllocationPct: sumAllocations(allocations),
    targetAllocations: allocations,
    confidence: "LOW",
    rationale: "가격 변화가 제한적이라 종목별 목표 비중을 작게 조정합니다.",
    riskNotes: ["큰 방향 전환 없이 평가금액과 비중만 다시 맞춥니다."],
    expectedHoldingMinutes: 30,
    invalidationPrice: null,
    source: "mock",
  };
}

function riskAdjustedEntry(riskMode: PaperTradingRiskMode): number {
  if (riskMode === "conservative") return 40;
  if (riskMode === "aggressive") return 80;
  return 60;
}

function allocateByMomentum(
  input: MockDecisionInput,
  totalTargetPct: number,
): PaperTradingDecision["targetAllocations"] {
  const snapshots = input.priceSnapshot;
  const rawWeights = snapshots.map((price) => {
    const position = input.positions.find((item) => item.ticker === price.ticker);
    if (position && position.unrealizedPnlPct <= PAPER_TRADING_POSITION_HARD_STOP_PCT) {
      return 0;
    }
    return Math.max(0.2, 1 + price.changePct / 10);
  });
  const totalWeight = rawWeights.reduce((sum, weight) => sum + weight, 0) || 1;

  return snapshots.map((price, index) => {
    const target = Math.min(
      input.maxPositionPct,
      (totalTargetPct * rawWeights[index]) / totalWeight,
    );
    return {
      ticker: price.ticker,
      name: price.name,
      targetAllocationPct: round(target),
      rationale:
        price.changePct >= 0
          ? `${withTopicParticle(price.name)} 최근 흐름이 상대적으로 양호해 목표 비중을 배정합니다.`
          : `${withTopicParticle(price.name)} 최근 흐름이 약해 목표 비중을 낮춰 잡습니다.`,
    };
  });
}

function sumAllocations(allocations: PaperTradingDecision["targetAllocations"]): number {
  return round(allocations.reduce((sum, item) => sum + item.targetAllocationPct, 0));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function withTopicParticle(name: string): string {
  const last = name.at(-1);
  if (!last) return name;
  const code = last.charCodeAt(0);
  const hasFinalConsonant = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${name}${hasFinalConsonant ? "은" : "는"}`;
}
