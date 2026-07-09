import { describe, expect, it } from "vitest";
import {
  buildTodaySessionByTicker,
  buildTodaySessionStocks,
  filterPastSessions,
} from "@/hooks/intraday/useIntradayPaperWatch";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

function session(overrides: Partial<PaperTradingSession>): PaperTradingSession {
  return {
    id: "s1",
    name: "단타 모의",
    status: "running",
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 1_000_000,
    portfolioValue: 1_000_000,
    returnPct: 0,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    aiProvider: "codex",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: "2026-07-09T00:30:00.000Z",
    endedAt: null,
    createdAt: "2026-07-09T00:30:00.000Z",
    updatedAt: "2026-07-09T00:30:00.000Z",
    ...overrides,
  };
}

describe("buildTodaySessionByTicker", () => {
  it("과거 running 세션은 오늘 티커 매핑에서 제외해 같은 종목을 다시 시작할 수 있게 한다", () => {
    const map = buildTodaySessionByTicker(
      [
        session({
          id: "old",
          startedAt: "2026-07-07T01:00:00.000Z",
          createdAt: "2026-07-07T01:00:00.000Z",
          updatedAt: "2026-07-07T01:00:00.000Z",
        }),
      ],
      "2026-07-09",
    );

    expect(map.has("005930")).toBe(false);
  });

  it("오늘 같은 종목 세션이 여럿이면 running 세션을 우선한다", () => {
    const completed = session({
      id: "done",
      status: "completed",
      updatedAt: "2026-07-09T02:00:00.000Z",
    });
    const running = session({
      id: "running",
      status: "running",
      updatedAt: "2026-07-09T01:00:00.000Z",
    });

    const map = buildTodaySessionByTicker([completed, running], "2026-07-09");

    expect(map.get("005930")?.id).toBe("running");
  });

  it("오늘 세션 종목만 표 자동 보존 대상에 포함한다", () => {
    const stocks = buildTodaySessionStocks(
      [
        session({
          id: "old",
          stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
          startedAt: "2026-07-07T01:00:00.000Z",
          createdAt: "2026-07-07T01:00:00.000Z",
        }),
        session({
          id: "today",
          tickers: ["000660"],
          stocks: [{ ticker: "000660", name: "SK하이닉스", market: "KOSPI" }],
        }),
      ],
      "2026-07-09",
    );

    expect(stocks.map((stock) => stock.ticker)).toEqual(["000660"]);
  });

  it("과거 세션은 오늘 액션 매핑 대신 히스토리 목록으로 분리한다", () => {
    const old = session({
      id: "old",
      startedAt: "2026-07-07T01:00:00.000Z",
      createdAt: "2026-07-07T01:00:00.000Z",
    });
    const today = session({ id: "today" });

    expect(filterPastSessions([old, today], "2026-07-09").map((s) => s.id)).toEqual([
      "old",
    ]);
  });
});
