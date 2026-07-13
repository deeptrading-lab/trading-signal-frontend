import { describe, expect, it } from "vitest";
import { computeRunPnl } from "@/hooks/intraday/useIntradayAutopilot";
import type { AutopilotRun } from "@/lib/types/paperTrading/autopilot";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

function makeRun(id: string): AutopilotRun {
  const iso = "2026-07-13T00:00:00.000Z";
  return {
    id,
    status: "active",
    owner: "me",
    totalCapital: 9_000_000,
    slotCount: 3,
    perSlotCash: 3_000_000,
    riskMode: "balanced",
    slots: [],
    cooldownUntilByTicker: {},
    rotationLog: [],
    lastSweepWindowStart: null,
    startedAt: iso,
    endedAt: null,
    createdAt: iso,
    updatedAt: iso,
  };
}

function session(over: Partial<PaperTradingSession>): PaperTradingSession {
  const iso = "2026-07-13T00:30:00.000Z";
  return {
    id: "s",
    name: "테스트",
    status: "running",
    tickers: ["100001"],
    stocks: [{ ticker: "100001", name: "종목" }],
    initialCash: 3_000_000,
    targetReturnPct: 5,
    cash: 3_000_000,
    portfolioValue: 3_000_000,
    returnPct: 0,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: iso,
    endedAt: null,
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

describe("computeRunPnl", () => {
  it("런 귀속 자식만 합산 — 교체 회수된 완료 세션 포함, 남의 세션 제외", () => {
    const run = makeRun("run-1");
    const pnl = computeRunPnl(run, [
      // 진행 중 자식 +30만.
      session({ id: "a", autopilotRunId: "run-1", portfolioValue: 3_300_000 }),
      // 교체 회수된 완료 자식 −10만 — 런 성과에 포함돼야 한다.
      session({ id: "b", autopilotRunId: "run-1", status: "completed", portfolioValue: 2_900_000 }),
      // 다른 런/수동 세션 — 제외.
      session({ id: "c", autopilotRunId: "run-2", portfolioValue: 9_999_999 }),
      session({ id: "d", portfolioValue: 1 }),
    ]);
    expect(pnl.childCount).toBe(2);
    expect(pnl.pnlKrw).toBe(200_000);
    expect(pnl.pnlPct).toBeCloseTo((200_000 / 6_000_000) * 100, 5);
  });

  it("런 없음/자식 없음 — 0 안전값", () => {
    expect(computeRunPnl(null, [])).toEqual({ childCount: 0, pnlKrw: 0, pnlPct: 0 });
    expect(computeRunPnl(makeRun("run-1"), [session({ id: "x" })])).toEqual({
      childCount: 0,
      pnlKrw: 0,
      pnlPct: 0,
    });
  });
});
