import { randomUUID } from "crypto";
import { decideWithMockProvider } from "@/lib/server/paperTrading/decisionProviders/mock";
import {
  getLivePriceSnapshot,
  type PaperTradingPriceSnapshotProvider,
} from "@/lib/server/paperTrading/marketData";
import { executeVirtualTrade } from "@/lib/server/paperTrading/virtualExecution";
import type {
  PaperTradingPosition,
  PaperTradingSession,
  PaperTradingTick,
  PaperTradingTriggeredBy,
} from "@/lib/types/paperTrading/paperTrading";

export type RunPaperTradingTickInput = {
  session: PaperTradingSession;
  positions: PaperTradingPosition[];
  existingTicks: PaperTradingTick[];
  triggeredBy: PaperTradingTriggeredBy;
  tickWindowStart: string;
  priceSnapshotProvider?: PaperTradingPriceSnapshotProvider;
};

export type RunPaperTradingTickResult = {
  session: PaperTradingSession;
  positions: PaperTradingPosition[];
  tick: PaperTradingTick;
};

export async function runPaperTradingTick(
  input: RunPaperTradingTickInput,
): Promise<RunPaperTradingTickResult> {
  const existing = input.existingTicks.find(
    (tick) => tick.tickWindowStart === input.tickWindowStart,
  );
  if (existing) {
    return {
      session: input.session,
      positions: input.positions,
      tick: existing,
    };
  }

  const tickIndex = input.existingTicks.length;
  const pricedAt = input.tickWindowStart;
  const priceSnapshotProvider = input.priceSnapshotProvider ?? getLivePriceSnapshot;
  const priceSnapshot = await priceSnapshotProvider(
    input.session.stocks,
    tickIndex,
    pricedAt,
  );
  const markedPortfolioValue =
    input.session.cash +
    input.positions.reduce((sum, item) => {
      const price = priceSnapshot.find((snapshot) => snapshot.ticker === item.ticker);
      return sum + item.quantity * (price?.price ?? item.lastPrice);
    }, 0);

  const decision = decideWithMockProvider({
    positions: input.positions,
    priceSnapshot,
    portfolioValue: markedPortfolioValue,
    returnPct: input.session.returnPct,
    riskMode: input.session.riskMode,
    maxPositionPct: input.session.maxPositionPct,
  });

  const executed = executeVirtualTrade({
    cash: input.session.cash,
    positions: input.positions,
    decision,
    priceSnapshot,
    maxPositionPct: input.session.maxPositionPct,
    cashBufferPct: input.session.cashBufferPct,
  });

  const portfolioValueAfter = executed.portfolioValue;
  const returnPctAfter =
    input.session.initialCash === 0
      ? 0
      : ((portfolioValueAfter - input.session.initialCash) / input.session.initialCash) * 100;
  const now = new Date().toISOString();
  const status = executed.skippedReason ? "skipped" : "executed";

  const tick: PaperTradingTick = {
    id: randomUUID(),
    sessionId: input.session.id,
    tickIndex,
    status,
    triggeredBy: input.triggeredBy,
    tickWindowStart: input.tickWindowStart,
    pricedAt,
    priceFreshnessSeconds: priceSnapshot[0]?.freshnessSeconds ?? 0,
    portfolioValueBefore: round(markedPortfolioValue),
    portfolioValueAfter: round(portfolioValueAfter),
    cashBefore: round(input.session.cash),
    cashAfter: round(executed.cash),
    returnPctAfter: round(returnPctAfter),
    decision,
    priceSnapshot,
    orders: executed.orders,
    rationale: executed.skippedReason ?? decision.rationale,
    guardAdjustments: executed.guardAdjustments,
    errorMessage: null,
    createdAt: now,
  };

  const session: PaperTradingSession = {
    ...input.session,
    cash: round(executed.cash),
    portfolioValue: round(portfolioValueAfter),
    returnPct: round(returnPctAfter),
    lastTickWindowStart: input.tickWindowStart,
    updatedAt: now,
  };

  return {
    session,
    positions: executed.positions,
    tick,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
