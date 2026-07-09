import { describe, expect, it } from "vitest";
import {
  buildPastSessionRows,
  intradayWatchStorageKey,
  toggleWatchItem,
  type Watch,
} from "@/components/intraday/IntradayWatchWorkspace";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

function session(overrides: Partial<PaperTradingSession>): PaperTradingSession {
  return {
    id: "s1",
    name: "단타 모의",
    status: "completed",
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 1_000_000,
    portfolioValue: 1_010_000,
    returnPct: 1,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    aiProvider: "codex",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: "2026-07-07T01:00:00.000Z",
    endedAt: "2026-07-07T06:40:00.000Z",
    createdAt: "2026-07-07T01:00:00.000Z",
    updatedAt: "2026-07-07T06:40:00.000Z",
    ...overrides,
  };
}

describe("IntradayWatchWorkspace helpers", () => {
  it("워치 localStorage 키를 KST 날짜별로 분리한다", () => {
    expect(intradayWatchStorageKey("2026-07-07")).toBe(
      "finsight:intraday-watch:2026-07-07",
    );
    expect(intradayWatchStorageKey("2026-07-09")).toBe(
      "finsight:intraday-watch:2026-07-09",
    );
  });

  it("추천 종목 칩은 같은 종목을 클릭할 때 추가와 제거를 토글한다", () => {
    const samsung: Watch = { ticker: "005930", name: "삼성전자" };
    const hynix: Watch = { ticker: "000660", name: "SK하이닉스" };

    const added = toggleWatchItem([samsung], hynix);
    expect(added.map((item) => item.ticker)).toEqual(["005930", "000660"]);

    const removed = toggleWatchItem(added, samsung);
    expect(removed.map((item) => item.ticker)).toEqual(["000660"]);
  });

  it("과거 세션을 기존 표 컴포넌트에 넘길 rows와 session map으로 복구한다", () => {
    const first = session({ id: "old-1" });
    const duplicateOlder = session({
      id: "old-0",
      startedAt: "2026-07-06T01:00:00.000Z",
    });
    const second = session({
      id: "old-2",
      tickers: ["000660"],
      stocks: [{ ticker: "000660", name: "SK하이닉스", market: "KOSPI" }],
    });

    const view = buildPastSessionRows([first, duplicateOlder, second]);

    expect(view.rows.map((item) => item.ticker)).toEqual(["005930", "000660"]);
    expect(view.sessionByTicker.get("005930")?.id).toBe("old-1");
    expect(view.sessionByTicker.get("000660")?.id).toBe("old-2");
  });
});
