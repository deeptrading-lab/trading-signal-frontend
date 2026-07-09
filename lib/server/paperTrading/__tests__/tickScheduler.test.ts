import { describe, expect, it } from "vitest";
import {
  closeOutRunningSessionsAtClose,
  closeOutStaleCrossdaySessions,
  runIntradayRiskSweep,
  runScheduledIntradayTicks,
  runWithLimit,
  selectSchedulableSessions,
} from "@/lib/server/paperTrading/tickScheduler";
import {
  getPaperTradingSessionDetail,
  resetPaperTradingStoreForTest,
  seedPaperTradingSessionForTest,
} from "@/lib/server/paperTrading/sessionStore";
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";
import type { PaperTradingPriceSnapshotProvider } from "@/lib/server/paperTrading/marketData";
import type {
  PaperTradingPosition,
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

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

  it("소유자 게이트 — 내 소유·미지정(레거시)은 포함, 다른 운영자 소유는 제외", () => {
    const me = resolveServerOperator();
    const picked = selectSchedulableSessions([
      session({ id: "mine", owner: me }),
      session({ id: "legacy" }), // owner 미지정 → 하위호환 포함
      session({ id: "friend", owner: "friend-op" }), // 다른 운영자 → 제외
      session({ id: "mock", decisionProvider: "mock", owner: me }), // provider 로 이미 제외
    ]);
    expect(picked.map((s) => s.id).sort()).toEqual(["legacy", "mine"]);
  });

  it("operator 인자 주입 시 그 기준으로 필터(테스트 주입)", () => {
    const picked = selectSchedulableSessions(
      [
        session({ id: "a", owner: "op-a" }),
        session({ id: "b", owner: "op-b" }),
        session({ id: "c" }), // 미지정 → 포함
      ],
      "op-b",
    );
    expect(picked.map((s) => s.id).sort()).toEqual(["b", "c"]);
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

  it("마감 후 시각이어도 틱 경로는 항상 -1(종료는 별도 함수 소관)", async () => {
    resetPaperTradingStoreForTest();
    // 금 21:00 KST — 틱은 안 돌고(-1), 종료 스윕이 별도로 처리한다.
    expect(await runScheduledIntradayTicks(new Date("2026-07-03T12:00:00.000Z"))).toBe(-1);
  });
});

describe("closeOutRunningSessionsAtClose (마감 후 자동 완료 게이트)", () => {
  it("장중·프리마켓·주말이면 실행하지 않는다(-1)", async () => {
    resetPaperTradingStoreForTest();
    expect(await closeOutRunningSessionsAtClose(new Date("2026-07-03T01:00:00.000Z"))).toBe(-1); // 금 10:00 KST 장중
    expect(await closeOutRunningSessionsAtClose(new Date("2026-07-02T23:00:00.000Z"))).toBe(-1); // 금 08:00 KST 프리마켓
    expect(await closeOutRunningSessionsAtClose(new Date("2026-07-04T06:41:00.000Z"))).toBe(-1); // 토 15:41 KST 주말
  });

  it("마감 유예 경계(15:40)는 아직 종료하지 않는다(-1) — 마지막 틱과 겹침 방지", async () => {
    resetPaperTradingStoreForTest();
    expect(await closeOutRunningSessionsAtClose(new Date("2026-07-03T06:40:00.000Z"))).toBe(-1); // 금 15:40 KST
  });

  it("마감 후(15:41+)이고 대상 세션이 없으면 0", async () => {
    resetPaperTradingStoreForTest();
    expect(await closeOutRunningSessionsAtClose(new Date("2026-07-03T06:41:00.000Z"))).toBe(0); // 금 15:41 KST
  });

  it("소유자 게이트 — 내 소유·미지정만 완료하고 다른 운영자 세션은 running 유지", async () => {
    resetPaperTradingStoreForTest();
    const me = resolveServerOperator();
    seedPaperTradingSessionForTest(session({ id: "mine", owner: me }));
    seedPaperTradingSessionForTest(session({ id: "legacy" })); // owner 미지정
    seedPaperTradingSessionForTest(session({ id: "friend", owner: "friend-op" }));
    // 금 15:41 KST — 마감 스윕 발화. 내 것 2건만 완료, 친구 세션은 그의 서버 몫으로 남긴다.
    expect(await closeOutRunningSessionsAtClose(new Date("2026-07-03T06:41:00.000Z"))).toBe(2);
    expect((await getPaperTradingSessionDetail("mine"))?.session.status).toBe("completed");
    expect((await getPaperTradingSessionDetail("legacy"))?.session.status).toBe("completed");
    expect((await getPaperTradingSessionDetail("friend"))?.session.status).toBe("running");
  });
});

// ─── A: 60초 리스크-only 스윕 ─────────────────────────────────────────────────

const heldPosition: PaperTradingPosition = {
  ticker: "005930",
  name: "삼성전자",
  quantity: 30,
  avgEntryPrice: 10_000,
  lastPrice: 10_000,
  marketValue: 300_000,
  unrealizedPnl: 0,
  unrealizedPnlPct: 0,
  allocationPct: 30,
  updatedAt: "2026-07-03T00:55:00.000Z",
};

/** 최근 틱(동적 손절선=invalidationPrice 9,800) — 리스크 스윕이 여기서 손절선을 읽는다. */
function lastTickWithStop(): PaperTradingTick {
  return {
    id: "seed-tick",
    sessionId: "pos",
    tickIndex: 0,
    status: "executed",
    triggeredBy: "auto",
    tickWindowStart: "2026-07-03T00:55:00.000Z",
    pricedAt: "2026-07-03T00:55:00.000Z",
    priceFreshnessSeconds: 0,
    portfolioValueBefore: 1_000_000,
    portfolioValueAfter: 1_000_000,
    cashBefore: 700_000,
    cashAfter: 700_000,
    returnPctAfter: 0,
    decision: {
      action: "BUY",
      targetAllocationPct: 30,
      targetAllocations: [{ ticker: "005930", name: "삼성전자", targetAllocationPct: 30, rationale: "진입" }],
      confidence: "MEDIUM",
      rationale: "진입",
      riskNotes: [],
      targetPrice: 10_400,
      invalidationPrice: 9_800,
      source: "cli-agent",
    },
    priceSnapshot: [],
    orders: [],
    rationale: "진입",
    guardAdjustments: [],
    errorMessage: null,
    createdAt: "2026-07-03T00:55:00.000Z",
  };
}

const priceAll = (won: number): PaperTradingPriceSnapshotProvider => async (stocks, _i, at) =>
  stocks.map((s) => ({ ticker: s.ticker, name: s.name, price: won, changePct: 0, asOf: at, freshnessSeconds: 0 }));

describe("runIntradayRiskSweep (A — 60초 리스크-only 체크)", () => {
  const marketNow = new Date("2026-07-03T01:00:00.000Z"); // 금 10:00 KST

  it("장외/주말이면 실행하지 않는다(-1)", async () => {
    resetPaperTradingStoreForTest();
    expect(await runIntradayRiskSweep(new Date("2026-07-03T12:00:00.000Z"))).toBe(-1); // 21:00 KST
    expect(await runIntradayRiskSweep(new Date("2026-07-04T01:00:00.000Z"))).toBe(-1); // 토요일
  });

  it("장중이지만 스케줄 대상 세션이 없으면 0", async () => {
    resetPaperTradingStoreForTest();
    expect(await runIntradayRiskSweep(marketNow)).toBe(0);
  });

  it("보유 포지션이 손절선을 하회하면 EXIT — risk 틱 기록(triggeredBy=risk), 무포지션화", async () => {
    resetPaperTradingStoreForTest();
    seedPaperTradingSessionForTest(session({ id: "pos", cash: 700_000 }), {
      positions: [heldPosition],
      ticks: [lastTickWithStop()],
    });
    // 9,700 ≤ 손절선 9,800 → 청산. 1개 세션 검사.
    expect(await runIntradayRiskSweep(marketNow, { priceSnapshotProvider: priceAll(9_700) })).toBe(1);
    const detail = await getPaperTradingSessionDetail("pos");
    expect(detail?.positions).toHaveLength(0);
    const riskTick = detail?.ticks.at(-1);
    expect(riskTick?.triggeredBy).toBe("risk");
    expect(riskTick?.orders.some((o) => o.side === "SELL")).toBe(true);
    expect(riskTick?.guardAdjustments.join(" ")).toContain("손절선");
  });

  it("무포지션 세션은 no-op — 틱을 만들지 않는다(플랫 스킵·중복 EXIT 없음)", async () => {
    resetPaperTradingStoreForTest();
    seedPaperTradingSessionForTest(session({ id: "flat" }), {
      positions: [],
      ticks: [lastTickWithStop()],
    });
    await runIntradayRiskSweep(marketNow, { priceSnapshotProvider: priceAll(9_700) });
    const detail = await getPaperTradingSessionDetail("flat");
    expect(detail?.ticks).toHaveLength(1); // 시드 틱 그대로 — 새 틱 없음
  });

  it("청산 후 재실행하면 무포지션이라 추가 틱을 만들지 않는다(멱등)", async () => {
    resetPaperTradingStoreForTest();
    seedPaperTradingSessionForTest(session({ id: "pos", cash: 700_000 }), {
      positions: [heldPosition],
      ticks: [lastTickWithStop()],
    });
    await runIntradayRiskSweep(marketNow, { priceSnapshotProvider: priceAll(9_700) });
    const afterFirst = (await getPaperTradingSessionDetail("pos"))?.ticks.length ?? 0;
    await runIntradayRiskSweep(marketNow, { priceSnapshotProvider: priceAll(9_700) });
    const afterSecond = (await getPaperTradingSessionDetail("pos"))?.ticks.length ?? 0;
    expect(afterSecond).toBe(afterFirst); // 두 번째는 무포지션 no-op
  });

  it("소유자 게이트 — 다른 운영자 세션은 리스크 검사하지 않는다(포지션 유지)", async () => {
    resetPaperTradingStoreForTest();
    seedPaperTradingSessionForTest(session({ id: "friend", owner: "friend-op", cash: 700_000 }), {
      positions: [heldPosition],
      ticks: [lastTickWithStop()],
    });
    expect(await runIntradayRiskSweep(marketNow, { priceSnapshotProvider: priceAll(9_700) })).toBe(0);
    const detail = await getPaperTradingSessionDetail("friend");
    expect(detail?.positions).toHaveLength(1); // 남 세션 미검사 → 청산 안 됨
  });

  it("가격이 손절선 위면 청산하지 않는다(불필요 EXIT 0)", async () => {
    resetPaperTradingStoreForTest();
    seedPaperTradingSessionForTest(session({ id: "pos", cash: 700_000 }), {
      positions: [heldPosition],
      ticks: [lastTickWithStop()],
    });
    await runIntradayRiskSweep(marketNow, { priceSnapshotProvider: priceAll(10_100) }); // 손절선·하드스톱 미도달
    const detail = await getPaperTradingSessionDetail("pos");
    expect(detail?.positions).toHaveLength(1);
    expect(detail?.ticks).toHaveLength(1);
  });
});

describe("closeOutStaleCrossdaySessions (밀린 이전-거래일 세션 정리)", () => {
  it("시작일이 오늘보다 이전인 running 세션을 시간·요일 무관하게 완료한다", async () => {
    resetPaperTradingStoreForTest();
    // 7/3(금) 11:00 KST 시작 세션. 서버가 마감 창(15:41~23:59)에 꺼져 있어 종료 못 함.
    seedPaperTradingSessionForTest(session({ id: "old", startedAt: "2026-07-03T02:00:00.000Z" }));
    // now = 7/6(월) 05:00 KST — 마감 창도 장중도 아닌 이른 아침이지만 밀린 세션은 정리돼야 한다.
    expect(await closeOutStaleCrossdaySessions(new Date("2026-07-05T20:00:00.000Z"))).toBe(1);
    expect((await getPaperTradingSessionDetail("old"))?.session.status).toBe("completed");
  });

  it("시작일이 오늘(프리마켓 포함)이면 건드리지 않는다(0)", async () => {
    resetPaperTradingStoreForTest();
    // 7/6(월) 08:30 KST 프리마켓 생성 — 개장 전이라 아직 살아있어야 한다.
    seedPaperTradingSessionForTest(session({ id: "today", startedAt: "2026-07-05T23:30:00.000Z" }));
    expect(await closeOutStaleCrossdaySessions(new Date("2026-07-05T23:40:00.000Z"))).toBe(0); // 7/6 08:40 KST
    expect((await getPaperTradingSessionDetail("today"))?.session.status).toBe("running");
  });
});
