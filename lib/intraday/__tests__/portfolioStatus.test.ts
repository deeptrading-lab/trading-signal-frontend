import { describe, expect, it } from "vitest";
import {
  buildIntradayPortfolioStockStatuses,
  latestIntradayPortfolio,
} from "@/lib/intraday/portfolioStatus";
import type {
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";

function session(
  id: string,
  portfolioId: string,
  status: PaperTradingSession["status"],
  createdAt: string,
): PaperTradingSession {
  return {
    id,
    portfolioId,
    status,
    createdAt,
    updatedAt: createdAt,
    startedAt: createdAt,
    endedAt: null,
    name: id,
    tickers: [id],
    stocks: [{ ticker: id, name: id }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 1_000_000,
    portfolioValue: 1_000_000,
    returnPct: 0,
    riskMode: "balanced",
    maxPositionPct: 30,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    mode: "live-paper",
    lastTickWindowStart: null,
  };
}

describe("latestIntradayPortfolio", () => {
  it("새로고침 시 최신 종료 묶음보다 실행 중 묶음을 우선 복원한다", () => {
    const running = session("A", "running-portfolio", "running", "2026-07-13T00:00:00Z");
    const completed = session("B", "completed-portfolio", "completed", "2026-07-13T01:00:00Z");

    expect(latestIntradayPortfolio([completed, running])).toEqual([running]);
  });

  it("일시정지 세션도 종료 전 포트폴리오로 복원한다", () => {
    const paused = session("A", "paused-portfolio", "paused", "2026-07-13T00:00:00Z");
    const completed = session("B", "completed-portfolio", "completed", "2026-07-13T01:00:00Z");

    expect(latestIntradayPortfolio([completed, paused])).toEqual([paused]);
  });
});

describe("buildIntradayPortfolioStockStatuses", () => {
  it("현재 보유 포지션과 가장 최근 체결을 종목 상태로 합친다", () => {
    const current = session("005930", "portfolio", "running", "2026-07-13T00:00:00Z");
    const detail = {
      session: current,
      positions: [
        {
          ticker: "005930",
          name: "삼성전자",
          quantity: 3,
          avgEntryPrice: 80_000,
          lastPrice: 81_000,
          marketValue: 243_000,
          unrealizedPnl: 3_000,
          unrealizedPnlPct: 1.25,
          allocationPct: 24.3,
          updatedAt: "2026-07-13T00:05:00Z",
        },
      ],
      ticks: [
        {
          tickWindowStart: "2026-07-13T00:05:00Z",
          orders: [
            {
              ticker: "005930",
              name: "삼성전자",
              side: "BUY",
              quantity: 3,
              price: 80_000,
              notional: 240_000,
              reason: "진입",
            },
          ],
        },
      ],
    } as PaperTradingSessionDetail;

    const [status] = buildIntradayPortfolioStockStatuses([current], [detail]);
    expect(status.position?.quantity).toBe(3);
    expect(status.latestOrder).toMatchObject({ side: "BUY", quantity: 3, price: 80_000 });
  });
});
