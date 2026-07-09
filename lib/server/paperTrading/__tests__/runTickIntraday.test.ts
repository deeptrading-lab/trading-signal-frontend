/**
 * runTick 의 cli-agent 분기 + forcedExit 전달 검증 (intraday-scalping-agent §3-5, AC-4/AC-7).
 * 실제 분봉/CLI 없이 intradayResolver 스텁으로 분기·청산 배선만 확인.
 */

import { describe, it, expect } from "vitest";
import { runPaperTradingTick } from "@/lib/server/paperTrading/runTick";
import {
  createPaperTradingSession,
  resetPaperTradingStoreForTest,
} from "@/lib/server/paperTrading/sessionStore";
import type { PaperTradingPriceSnapshotProvider } from "@/lib/server/paperTrading/marketData";
import type {
  PaperTradingPosition,
  PaperTradingSession,
} from "@/lib/types/paperTrading/paperTrading";
import type { IntradayTickResult } from "@/lib/server/paperTrading/intradayTickDecision";

function session(over: Partial<PaperTradingSession> = {}): PaperTradingSession {
  return {
    id: "s1",
    name: "단타",
    status: "running",
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
    initialCash: 1_000_000,
    targetReturnPct: 3,
    cash: 1_000_000,
    portfolioValue: 1_000_000,
    returnPct: 0,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: "2026-06-29T00:00:00.000Z",
    endedAt: null,
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
    ...over,
  };
}

const priceAt = (won: number): PaperTradingPriceSnapshotProvider => async (stocks, _i, at) =>
  stocks.map((s) => ({ ticker: s.ticker, name: s.name, price: won, changePct: 0, asOf: at, freshnessSeconds: 0 }));

describe("runPaperTradingTick — cli-agent 분기", () => {
  it("cli-agent 세션은 intradayResolver 를 호출하고 그 결정으로 체결", async () => {
    let called = false;
    const resolver = async (): Promise<IntradayTickResult> => {
      called = true;
      return {
        decision: {
          action: "BUY",
          targetAllocationPct: 50,
          targetAllocations: [{ ticker: "005930", name: "삼성전자", targetAllocationPct: 50, rationale: "진입" }],
          confidence: "MEDIUM",
          rationale: "박스 상단 돌파 진입.",
          riskNotes: [],
          targetPrice: 10_400,
          invalidationPrice: 9_800,
          source: "cli-agent",
        },
        forcedExit: { targetPrice: 10_400, stopPrice: 9_800, flattenAll: false },
      };
    };

    const result = await runPaperTradingTick({
      session: session(),
      positions: [],
      existingTicks: [],
      triggeredBy: "auto",
      tickWindowStart: "2026-06-29T01:00:00.000Z", // 10:00 KST
      priceSnapshotProvider: priceAt(10_000),
      intradayResolver: resolver,
    });

    expect(called).toBe(true);
    expect(result.tick.decision.action).toBe("BUY");
    expect(result.tick.orders.length).toBeGreaterThan(0);
  });

  it("resolver 의 forcedExit 손절 트리거가 보유 포지션을 청산", async () => {
    const held: PaperTradingPosition = {
      ticker: "005930",
      name: "삼성전자",
      quantity: 30,
      avgEntryPrice: 10_000,
      lastPrice: 10_000,
      marketValue: 300_000,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      allocationPct: 30,
      updatedAt: "2026-06-29T00:55:00.000Z",
    };
    const resolver = async (): Promise<IntradayTickResult> => ({
      decision: {
        action: "HOLD",
        targetAllocationPct: 30,
        targetAllocations: [{ ticker: "005930", name: "삼성전자", targetAllocationPct: 30, rationale: "유지" }],
        confidence: "LOW",
        rationale: "유지",
        riskNotes: [],
        invalidationPrice: 9_800,
        source: "cli-agent",
      },
      forcedExit: { targetPrice: 10_400, stopPrice: 9_800, flattenAll: false },
    });

    const result = await runPaperTradingTick({
      session: session({ cash: 700_000 }),
      positions: [held],
      existingTicks: [],
      triggeredBy: "auto",
      tickWindowStart: "2026-06-29T01:00:00.000Z",
      priceSnapshotProvider: priceAt(9_700), // 손절가 아래
      intradayResolver: resolver,
    });

    expect(result.positions).toHaveLength(0);
    expect(result.tick.guardAdjustments.join(" ")).toContain("손절선");
  });

  it("포지션 하드스톱(−5%) 배선 — 동적 손절선 없이 급락해도 runTick 이 세션 설정으로 청산(B)", async () => {
    const held: PaperTradingPosition = {
      ticker: "005930",
      name: "삼성전자",
      quantity: 30,
      avgEntryPrice: 10_000,
      lastPrice: 10_000,
      marketValue: 300_000,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      allocationPct: 30,
      updatedAt: "2026-06-29T00:55:00.000Z",
    };
    // resolver 는 동적 손절선을 주지 않는다(stopPrice null). 하드스톱은 runTick 이 세션에서 주입.
    const resolver = async (): Promise<IntradayTickResult> => ({
      decision: {
        action: "HOLD",
        targetAllocationPct: 30,
        targetAllocations: [{ ticker: "005930", name: "삼성전자", targetAllocationPct: 30, rationale: "유지" }],
        confidence: "LOW",
        rationale: "유지",
        riskNotes: [],
        source: "cli-agent",
      },
      forcedExit: { targetPrice: null, stopPrice: null, flattenAll: false },
    });

    const result = await runPaperTradingTick({
      session: session({ cash: 700_000 }), // positionHardStopPct 미설정 → riskMode 기본 −5%
      positions: [held],
      existingTicks: [],
      triggeredBy: "auto",
      tickWindowStart: "2026-06-29T01:00:00.000Z",
      priceSnapshotProvider: priceAt(9_400), // −6% → 하드스톱 −5% 발동
      intradayResolver: resolver,
    });

    expect(result.positions).toHaveLength(0);
    expect(result.tick.guardAdjustments.join(" ")).toContain("포지션 손실 한도(-5%)");
  });
});

describe("createPaperTradingSession — cli-agent 세션", () => {
  it("provider 를 존중하고 단타 주기(5분)로 설정", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession(
      {
        name: "단타",
        tickers: ["005930"],
        stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
        initialCash: 1_000_000,
        targetReturnPct: 3,
        riskMode: "balanced",
        decisionProvider: "cli-agent",
      },
      { priceSnapshotProvider: priceAt(10_000) },
    );
    expect(detail.session.decisionProvider).toBe("cli-agent");
    expect(detail.session.tickIntervalMinutes).toBe(5);
  });

  it("하드스톱 기본 스탬프 — 미지정이면 riskMode 기본(−5/−7)", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession(
      {
        name: "단타",
        tickers: ["005930"],
        stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
        initialCash: 1_000_000,
        targetReturnPct: 3,
        riskMode: "balanced",
        decisionProvider: "cli-agent",
      },
      { priceSnapshotProvider: priceAt(10_000) },
    );
    expect(detail.session.positionHardStopPct).toBe(-5);
    expect(detail.session.sessionHardStopPct).toBe(-7);
  });

  it("하드스톱 명시 override 존중 — −8·끄기(null)", async () => {
    resetPaperTradingStoreForTest();
    const aggressive = await createPaperTradingSession(
      {
        name: "단타공격",
        tickers: ["005930"],
        stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
        initialCash: 1_000_000,
        targetReturnPct: 3,
        riskMode: "balanced",
        decisionProvider: "cli-agent",
        positionHardStopPct: -8,
      },
      { priceSnapshotProvider: priceAt(10_000) },
    );
    expect(aggressive.session.positionHardStopPct).toBe(-8);

    const off = await createPaperTradingSession(
      {
        name: "단타끄기",
        tickers: ["000660"],
        stocks: [{ ticker: "000660", name: "SK하이닉스", market: "KOSPI" }],
        initialCash: 1_000_000,
        targetReturnPct: 3,
        riskMode: "balanced",
        decisionProvider: "cli-agent",
        positionHardStopPct: null,
      },
      { priceSnapshotProvider: priceAt(10_000) },
    );
    expect(off.session.positionHardStopPct).toBeNull();
  });
});
