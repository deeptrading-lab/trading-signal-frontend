import { beforeEach, describe, expect, it } from "vitest";
import {
  completePaperTradingPortfolio,
  getPaperTradingSessionDetail,
  resetPaperTradingStoreForTest,
  seedPaperTradingSessionForTest,
} from "@/lib/server/paperTrading/sessionStore";
import type { PaperTradingPriceSnapshotProvider } from "@/lib/server/paperTrading/marketData";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

const priceProvider: PaperTradingPriceSnapshotProvider = async (stocks, _tickIndex, at) =>
  stocks.map((stock) => ({
    ticker: stock.ticker,
    name: stock.name,
    price: 11_000,
    changePct: 10,
    asOf: at,
    freshnessSeconds: 0,
  }));

function portfolioSession(id: string, status: PaperTradingSession["status"] = "running") {
  const at = "2026-07-13T01:00:00.000Z";
  return {
    id,
    name: `자동 · ${id}`,
    status,
    tickers: [id],
    stocks: [{ ticker: id, name: id }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 500_000,
    portfolioValue: 1_050_000,
    returnPct: 5,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    portfolioId: "portfolio-1",
    portfolioName: "자동 포트폴리오",
    portfolioAllocationPct: 50,
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: at,
    endedAt: null,
    createdAt: at,
    updatedAt: at,
  } satisfies PaperTradingSession;
}

describe("completePaperTradingPortfolio", () => {
  beforeEach(() => resetPaperTradingStoreForTest());

  it("보유 포지션을 최신 가격으로 전량 매도한 뒤 세션을 완료한다", async () => {
    const session = portfolioSession("005930");
    seedPaperTradingSessionForTest(session, {
      positions: [
        {
          ticker: "005930",
          name: "삼성전자",
          quantity: 50,
          avgEntryPrice: 10_000,
          lastPrice: 10_500,
          marketValue: 525_000,
          unrealizedPnl: 25_000,
          unrealizedPnlPct: 5,
          allocationPct: 50,
          updatedAt: session.updatedAt,
        },
      ],
    });

    const result = await completePaperTradingPortfolio("portfolio-1", {
      priceSnapshotProvider: priceProvider,
      now: new Date("2026-07-13T01:05:00.000Z"),
    });
    const detail = await getPaperTradingSessionDetail("005930");

    expect(result?.completedSessionIds).toEqual(["005930"]);
    expect(detail?.session.status).toBe("completed");
    expect(detail?.positions).toHaveLength(0);
    expect(detail?.ticks.at(-1)?.orders[0]).toMatchObject({
      side: "SELL",
      quantity: 50,
    });
    expect(detail?.ticks.at(-1)?.orders[0]?.realizedPnl).toBeTypeOf("number");
  });

  it("이미 완료된 세션은 체결을 중복 생성하지 않는다", async () => {
    seedPaperTradingSessionForTest(portfolioSession("005930", "completed"));

    const result = await completePaperTradingPortfolio("portfolio-1", {
      priceSnapshotProvider: priceProvider,
    });

    expect(result?.alreadyCompletedSessionIds).toEqual(["005930"]);
    expect((await getPaperTradingSessionDetail("005930"))?.ticks).toHaveLength(0);
  });

  it("신선한 청산 가격을 얻지 못하면 포지션과 실행 상태를 그대로 유지한다", async () => {
    const session = portfolioSession("005930");
    seedPaperTradingSessionForTest(session, {
      positions: [
        {
          ticker: "005930",
          name: "삼성전자",
          quantity: 10,
          avgEntryPrice: 10_000,
          lastPrice: 10_000,
          marketValue: 100_000,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          allocationPct: 10,
          updatedAt: session.updatedAt,
        },
      ],
    });
    const staleProvider: PaperTradingPriceSnapshotProvider = async (stocks, _index, at) =>
      stocks.map((stock) => ({
        ticker: stock.ticker,
        name: stock.name,
        price: 11_000,
        changePct: 10,
        asOf: at,
        freshnessSeconds: 10_000,
      }));

    await expect(
      completePaperTradingPortfolio("portfolio-1", {
        priceSnapshotProvider: staleProvider,
        now: new Date("2026-07-13T01:05:00.000Z"),
      }),
    ).rejects.toThrow("청산 가격");

    const detail = await getPaperTradingSessionDetail("005930");
    expect(detail?.session.status).toBe("running");
    expect(detail?.positions[0]?.quantity).toBe(10);
    expect(detail?.ticks).toHaveLength(0);
  });
});
