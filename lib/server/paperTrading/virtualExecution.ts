import {
  PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT,
  PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
  PAPER_TRADING_MAX_STALE_PRICE_SECONDS,
} from "@/lib/server/paperTrading/constants";
import type {
  PaperTradingDecision,
  PaperTradingOrder,
  PaperTradingPosition,
  PaperTradingPriceSnapshot,
} from "@/lib/types/paperTrading/paperTrading";

export type VirtualExecutionInput = {
  cash: number;
  positions: PaperTradingPosition[];
  decision: PaperTradingDecision;
  priceSnapshot: PaperTradingPriceSnapshot[];
  maxPositionPct?: number;
  cashBufferPct?: number;
};

export type VirtualExecutionResult = {
  cash: number;
  positions: PaperTradingPosition[];
  orders: PaperTradingOrder[];
  portfolioValue: number;
  returnPct: number;
  guardAdjustments: string[];
  skippedReason: string | null;
};

export function executeVirtualTrade(input: VirtualExecutionInput): VirtualExecutionResult {
  const maxPositionPct = input.maxPositionPct ?? PAPER_TRADING_DEFAULT_MAX_POSITION_PCT;
  const cashBufferPct = input.cashBufferPct ?? PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT;
  const guardAdjustments: string[] = [];
  const price = input.priceSnapshot[0];

  if (!price || price.freshnessSeconds > PAPER_TRADING_MAX_STALE_PRICE_SECONDS) {
    return markOnly(input.cash, input.positions, input.priceSnapshot, guardAdjustments, "가격 정보가 오래되어 가상 주문을 건너뜁니다.");
  }

  const markedPositions = markPositions(input.positions, input.priceSnapshot);
  const portfolioBefore = input.cash + sumMarketValue(markedPositions);
  if (portfolioBefore <= 0) {
    return {
      cash: input.cash,
      positions: markedPositions,
      orders: [],
      portfolioValue: 0,
      returnPct: 0,
      guardAdjustments,
      skippedReason: "평가금액이 0이라 가상 체결을 계산할 수 없어요.",
    };
  }

  const minimumCash = portfolioBefore * (cashBufferPct / 100);
  const maxInvestableValue = Math.max(0, portfolioBefore - minimumCash);

  const targets = normalizeTargets(input.decision, input.priceSnapshot, maxPositionPct);
  if (targets.adjustedForMax) {
    guardAdjustments.push("종목별 최대 비중에 맞춰 주문 크기를 줄였어요.");
  }

  const totalTargetValue = targets.items.reduce(
    (sum, item) => sum + portfolioBefore * (item.targetAllocationPct / 100),
    0,
  );
  const scale = totalTargetValue > maxInvestableValue && totalTargetValue > 0
    ? maxInvestableValue / totalTargetValue
    : 1;
  if (scale < 1) {
    guardAdjustments.push("최소 현금 보유 비중을 남기도록 전체 주문 크기를 줄였어요.");
  }

  let nextCash = input.cash;
  let nextPositions = markedPositions;
  const orders: PaperTradingOrder[] = [];

  for (const target of targets.items) {
    const snapshot = input.priceSnapshot.find((item) => item.ticker === target.ticker);
    if (!snapshot) continue;
    if (snapshot.price <= 0) {
      guardAdjustments.push(`${target.ticker} 현재가가 0원이라 가상 주문을 건너뛰었어요.`);
      continue;
    }
    const position = nextPositions.find((item) => item.ticker === target.ticker);
    const currentQuantity = position?.quantity ?? 0;
    const targetValue = portfolioBefore * (target.targetAllocationPct / 100) * scale;
    const targetQuantity = Math.floor(targetValue / snapshot.price);
    const deltaQuantity = targetQuantity - Math.floor(currentQuantity);

    if (deltaQuantity === 0) {
      if (targetValue > 0 && targetQuantity === 0) {
        guardAdjustments.push(`${snapshot.name} 목표 비중은 있으나 현금이 부족해 1주도 체결하지 않았어요.`);
      }
      continue;
    }

    const side: PaperTradingOrder["side"] = deltaQuantity > 0 ? "BUY" : "SELL";
    const availableCash = Math.max(0, nextCash - minimumCash);
    const executableQuantity =
      side === "BUY"
        ? Math.min(deltaQuantity, Math.floor(availableCash / snapshot.price))
        : Math.min(Math.abs(deltaQuantity), Math.floor(currentQuantity));

    if (executableQuantity <= 0) {
      guardAdjustments.push(
        side === "BUY"
          ? `${snapshot.name} 매수는 현금이 부족해 체결하지 않았어요.`
          : `${snapshot.name} 매도 가능 수량이 없어 체결하지 않았어요.`,
      );
      continue;
    }

    if (side === "BUY" && executableQuantity < deltaQuantity) {
      guardAdjustments.push(`${snapshot.name} 매수 수량을 주문 가능 현금에 맞춰 줄였어요.`);
    }

    const signedQuantity = side === "BUY" ? executableQuantity : -executableQuantity;
    const notional = executableQuantity * snapshot.price;
    nextCash = side === "BUY" ? nextCash - notional : nextCash + notional;
    const nextQuantity = Math.max(0, Math.floor(currentQuantity) + signedQuantity);
    const nextAvgEntryPrice =
      side === "BUY" && position
        ? weightedAverage(position.avgEntryPrice, Math.floor(currentQuantity), snapshot.price, executableQuantity)
        : side === "BUY"
          ? snapshot.price
          : position?.avgEntryPrice ?? snapshot.price;

    const nextPosition: PaperTradingPosition = {
      ticker: snapshot.ticker,
      name: snapshot.name,
      quantity: nextQuantity,
      avgEntryPrice: nextAvgEntryPrice,
      lastPrice: snapshot.price,
      marketValue: nextQuantity * snapshot.price,
      unrealizedPnl: (snapshot.price - nextAvgEntryPrice) * nextQuantity,
      unrealizedPnlPct: nextAvgEntryPrice === 0 ? 0 : ((snapshot.price - nextAvgEntryPrice) / nextAvgEntryPrice) * 100,
      allocationPct: 0,
      updatedAt: snapshot.asOf,
    };

    nextPositions = replacePosition(nextPositions, nextPosition).filter(
      (item) => item.quantity >= 1,
    );
    orders.push({
      ticker: snapshot.ticker,
      name: snapshot.name,
      side,
      quantity: executableQuantity,
      price: snapshot.price,
      notional,
      reason: target.rationale,
    });
  }

  const portfolioAfter = nextCash + sumMarketValue(nextPositions);
  const allocatedPositions = withAllocations(nextPositions, portfolioAfter);

  return buildResult(nextCash, allocatedPositions, orders, portfolioAfter, guardAdjustments, null);
}

function normalizeTargets(
  decision: PaperTradingDecision,
  prices: PaperTradingPriceSnapshot[],
  maxPositionPct: number,
): {
  items: Array<{ ticker: string; targetAllocationPct: number; rationale: string }>;
  adjustedForMax: boolean;
} {
  const source =
    decision.targetAllocations.length > 0
      ? decision.targetAllocations
      : prices.map((price) => ({
          ticker: price.ticker,
          name: price.name,
          targetAllocationPct: decision.action === "EXIT" ? 0 : decision.targetAllocationPct,
          rationale: decision.rationale,
        }));
  let adjustedForMax = false;
  const items = source.map((target) => {
    const normalized = Math.min(
      maxPositionPct,
      Math.max(0, decision.action === "EXIT" ? 0 : target.targetAllocationPct),
    );
    if (normalized !== target.targetAllocationPct) adjustedForMax = true;
    return {
      ticker: target.ticker,
      targetAllocationPct: normalized,
      rationale: target.rationale,
    };
  });
  return { items, adjustedForMax };
}

function markOnly(
  cash: number,
  positions: PaperTradingPosition[],
  prices: PaperTradingPriceSnapshot[],
  guardAdjustments: string[],
  skippedReason: string,
): VirtualExecutionResult {
  const marked = markPositions(positions, prices);
  const portfolioValue = cash + sumMarketValue(marked);
  return buildResult(cash, withAllocations(marked, portfolioValue), [], portfolioValue, guardAdjustments, skippedReason);
}

export function markPositions(
  positions: PaperTradingPosition[],
  prices: PaperTradingPriceSnapshot[],
): PaperTradingPosition[] {
  return positions.map((position) => {
    const price = prices.find((item) => item.ticker === position.ticker);
    if (!price) return position;
    const marketValue = position.quantity * price.price;
    const unrealizedPnl = (price.price - position.avgEntryPrice) * position.quantity;
    return {
      ...position,
      lastPrice: price.price,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct:
        position.avgEntryPrice === 0
          ? 0
          : ((price.price - position.avgEntryPrice) / position.avgEntryPrice) * 100,
      updatedAt: price.asOf,
    };
  });
}

function replacePosition(
  positions: PaperTradingPosition[],
  next: PaperTradingPosition,
): PaperTradingPosition[] {
  const exists = positions.some((item) => item.ticker === next.ticker);
  if (!exists) return [...positions, next];
  return positions.map((item) => (item.ticker === next.ticker ? next : item));
}

function withAllocations(
  positions: PaperTradingPosition[],
  portfolioValue: number,
): PaperTradingPosition[] {
  return positions.map((position) => ({
    ...position,
    allocationPct: portfolioValue === 0 ? 0 : (position.marketValue / portfolioValue) * 100,
  }));
}

function weightedAverage(
  oldPrice: number,
  oldQuantity: number,
  buyPrice: number,
  buyQuantity: number,
): number {
  const totalQuantity = oldQuantity + Math.max(0, buyQuantity);
  if (totalQuantity <= 0) return buyPrice;
  return (oldPrice * oldQuantity + buyPrice * Math.max(0, buyQuantity)) / totalQuantity;
}

function buildResult(
  cash: number,
  positions: PaperTradingPosition[],
  orders: PaperTradingOrder[],
  portfolioValue: number,
  guardAdjustments: string[],
  skippedReason: string | null,
): VirtualExecutionResult {
  return {
    cash: round(cash),
    positions: positions.map(roundPosition),
    orders: orders.map(roundOrder),
    portfolioValue: round(portfolioValue),
    returnPct: 0,
    guardAdjustments,
    skippedReason,
  };
}

function sumMarketValue(positions: PaperTradingPosition[]): number {
  return positions.reduce((sum, item) => sum + item.marketValue, 0);
}

function roundPosition(position: PaperTradingPosition): PaperTradingPosition {
  return {
    ...position,
    quantity: round(position.quantity),
    avgEntryPrice: round(position.avgEntryPrice),
    lastPrice: round(position.lastPrice),
    marketValue: round(position.marketValue),
    unrealizedPnl: round(position.unrealizedPnl),
    unrealizedPnlPct: round(position.unrealizedPnlPct),
    allocationPct: round(position.allocationPct),
  };
}

function roundOrder(order: PaperTradingOrder): PaperTradingOrder {
  return {
    ...order,
    quantity: round(order.quantity),
    price: round(order.price),
    notional: round(order.notional),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
