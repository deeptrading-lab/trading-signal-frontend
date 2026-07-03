import { randomUUID } from "crypto";
import { PAPER_TRADING_INTRADAY_COSTS } from "@/lib/server/paperTrading/constants";
import { decideWithMockProvider } from "@/lib/server/paperTrading/decisionProviders/mock";
import {
  getLivePriceSnapshot,
  type PaperTradingPriceSnapshotProvider,
} from "@/lib/server/paperTrading/marketData";
import { executeVirtualTrade } from "@/lib/server/paperTrading/virtualExecution";
import {
  resolveIntradayTickDecision,
  type IntradayTickArgs,
  type IntradayTickResult,
} from "@/lib/server/paperTrading/intradayTickDecision";
import type {
  PaperTradingDecision,
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
  /**
   * 단타(cli-agent) 결정 resolver 주입 — 테스트 스텁용. 기본 `resolveIntradayTickDecision`
   * (분봉/일봉 페치 + 에이전트 그룹). mock/existing-ai 세션에는 사용 안 함.
   */
  intradayResolver?: (args: IntradayTickArgs) => Promise<IntradayTickResult>;
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

  let decision: PaperTradingDecision;
  let forcedExit: Parameters<typeof executeVirtualTrade>[0]["forcedExit"];

  if (input.session.decisionProvider === "cli-agent") {
    // 단타 경량 에이전트 그룹(로컬 CLI) — 분봉/일봉 기반 절대가 판단 + 청산 트리거.
    const resolver = input.intradayResolver ?? resolveIntradayTickDecision;
    const resolved = await resolver({
      session: input.session,
      positions: input.positions,
      priceSnapshot,
      existingTicks: input.existingTicks,
      tickWindowStart: input.tickWindowStart,
    });
    decision = resolved.decision;
    forcedExit = resolved.forcedExit;
  } else {
    decision = decideWithMockProvider({
      positions: input.positions,
      priceSnapshot,
      portfolioValue: markedPortfolioValue,
      returnPct: input.session.returnPct,
      riskMode: input.session.riskMode,
      maxPositionPct: input.session.maxPositionPct,
    });
  }

  const executed = executeVirtualTrade({
    cash: input.session.cash,
    positions: input.positions,
    decision,
    priceSnapshot,
    maxPositionPct: input.session.maxPositionPct,
    cashBufferPct: input.session.cashBufferPct,
    // 거래 비용은 단타(cli-agent)에만 반영 — 판단 품질 테스트의 낙관 편향 방지. mock 경로 무변경.
    costs: input.session.decisionProvider === "cli-agent" ? PAPER_TRADING_INTRADAY_COSTS : undefined,
    forcedExit,
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
