import { describe, expect, it } from "vitest";
import {
  runScheduledIntradayTicks,
  runWithLimit,
  selectSchedulableSessions,
} from "@/lib/server/paperTrading/tickScheduler";
import { resetPaperTradingStoreForTest } from "@/lib/server/paperTrading/sessionStore";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

function session(over: Partial<PaperTradingSession>): PaperTradingSession {
  return {
    id: "s",
    name: "테스트",
    status: "running",
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "삼성전자" }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 1_000_000,
    portfolioValue: 1_000_000,
    returnPct: 0,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 2,
    decisionProvider: "cli-agent",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: "2026-07-03T00:00:00.000Z",
    endedAt: null,
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...over,
  };
}

describe("selectSchedulableSessions", () => {
  it("running + cli-agent 만 스케줄 대상", () => {
    const picked = selectSchedulableSessions([
      session({ id: "a" }),
      session({ id: "b", status: "paused" }),
      session({ id: "c", status: "completed" }),
      session({ id: "d", decisionProvider: "mock" }),
    ]);
    expect(picked.map((s) => s.id)).toEqual(["a"]);
  });
});

describe("runWithLimit (세션 간 병렬 풀)", () => {
  it("동시 실행이 limit 을 넘지 않고 전 항목을 처리한다", async () => {
    let inflight = 0;
    let maxInflight = 0;
    const done: number[] = [];
    await runWithLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise((r) => setTimeout(r, 5));
      inflight -= 1;
      done.push(n);
    });
    expect(maxInflight).toBeLessThanOrEqual(3);
    expect(maxInflight).toBeGreaterThan(1); // 실제로 병렬이었는지.
    expect(done.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("runScheduledIntradayTicks (장중 게이트)", () => {
  it("장외/주말이면 실행하지 않는다(-1)", async () => {
    resetPaperTradingStoreForTest();
    expect(await runScheduledIntradayTicks(new Date("2026-07-03T12:00:00.000Z"))).toBe(-1); // 21:00 KST
    expect(await runScheduledIntradayTicks(new Date("2026-07-04T01:00:00.000Z"))).toBe(-1); // 토요일
  });

  it("장중이지만 스케줄 대상 세션이 없으면 0", async () => {
    resetPaperTradingStoreForTest();
    expect(await runScheduledIntradayTicks(new Date("2026-07-03T01:00:00.000Z"))).toBe(0); // 금 10:00 KST
  });
});
