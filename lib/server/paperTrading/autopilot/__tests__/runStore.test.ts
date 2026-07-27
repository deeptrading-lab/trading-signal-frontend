import { beforeEach, describe, expect, it } from "vitest";
import {
  closeOutAutopilotRuns,
  resetAutopilotStoreForTest,
  respondToAutopilotGuide,
  seedAutopilotRunForTest,
  startAutopilotRun,
  stopAutopilotRun,
  sweepAutopilotRuns,
  type AutopilotSweepDeps,
} from "@/lib/server/paperTrading/autopilot/runStore";
import type { AutopilotScreenerResult } from "@/lib/server/paperTrading/autopilot/screener";
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";
import type {
  AutopilotCandidate,
  AutopilotRun,
  AutopilotScreenerSnapshot,
} from "@/lib/types/paperTrading/autopilot";
import type {
  CreatePaperTradingSessionRequest,
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";

/** KST 10:00 월요일(2026-07-13) — 장중·fill 창 안. */
const MARKET_OPEN = new Date("2026-07-13T01:00:00Z");
/** KST 16:00 — 마감 후. */
const AFTER_CLOSE = new Date("2026-07-13T07:00:00Z");
/** KST 07:00 화요일 — 평일 프리마켓(장외). */
const PREMARKET = new Date("2026-07-13T22:00:00Z");

const OPERATOR = resolveServerOperator();

function candidate(ticker: string, finalScore = 0.8): AutopilotCandidate {
  return {
    ticker,
    name: `종목${ticker}`,
    sources: ["volume"],
    price: 10_000,
    changePercent: 4,
    score1: 0.6,
    score2: finalScore,
    finalScore,
  };
}

function okScreener(tickers: string[]): AutopilotScreenerResult {
  const ranking = tickers.map((t, i) => candidate(t, 0.9 - i * 0.1));
  return {
    status: "ok",
    stage1Ranking: ranking,
    fillRanking: ranking,
    universeSize: ranking.length,
    rejected: [],
  };
}

function makeRun(over: Partial<AutopilotRun> = {}): AutopilotRun {
  const nowIso = "2026-07-13T00:00:00.000Z";
  const slotCount = over.slotCount ?? 3;
  return {
    id: `run-${Math.random().toString(36).slice(2, 8)}`,
    status: "active",
    owner: OPERATOR,
    totalCapital: 9_999_999,
    slotCount,
    perSlotCash: Math.floor(9_999_999 / slotCount),
    riskMode: "balanced",
    slots: Array.from({ length: slotCount }, (_, i) => ({
      slotIndex: i,
      sessionId: null,
      ticker: null,
      filledAt: null,
    })),
    cooldownUntilByTicker: {},
    rotationLog: [],
    lastSweepWindowStart: null,
    startedAt: nowIso,
    endedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...over,
  };
}

function makeSession(over: Partial<PaperTradingSession>): PaperTradingSession {
  const iso = "2026-07-13T00:30:00.000Z";
  return {
    id: "s",
    name: "테스트",
    status: "running",
    tickers: ["100001"],
    stocks: [{ ticker: "100001", name: "종목" }],
    initialCash: 3_333_333,
    targetReturnPct: 5,
    cash: 3_333_333,
    portfolioValue: 3_333_333,
    returnPct: 0,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    owner: OPERATOR,
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: iso,
    endedAt: null,
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

function toDetail(session: PaperTradingSession): PaperTradingSessionDetail {
  return { session, positions: [], ticks: [], equityCurve: [], latestDecision: null };
}

function guideDetail(runId: string, side: "BUY" | "SELL"): PaperTradingSessionDetail {
  const session = makeSession({ id: "guide-session", autopilotRunId: runId });
  return {
    ...toDetail(session),
    ticks: [
      {
        id: `tick-${side.toLowerCase()}`,
        sessionId: session.id,
        tickIndex: 1,
        status: "executed",
        triggeredBy: "auto",
        tickWindowStart: "2026-07-13T01:00:00.000Z",
        pricedAt: "2026-07-13T01:00:00.000Z",
        priceFreshnessSeconds: 0,
        portfolioValueBefore: 3_333_333,
        portfolioValueAfter: 3_333_333,
        cashBefore: 3_333_333,
        cashAfter: 3_333_333,
        returnPctAfter: 0,
        decision: {
          action: side,
          targetAllocationPct: side === "BUY" ? 50 : 0,
          targetAllocations: [],
          confidence: "HIGH",
          rationale: "테스트 판단",
          riskNotes: [],
          source: "cli-agent",
        },
        priceSnapshot: [],
        orders: [
          {
            ticker: "100001",
            name: "종목",
            side,
            quantity: 10,
            price: 10_000,
            notional: 100_000,
            reason: "테스트 주문",
          },
        ],
        rationale: "테스트 판단",
        guardAdjustments: [],
        errorMessage: null,
        createdAt: "2026-07-13T01:00:00.000Z",
      },
    ],
  };
}

/** 기본 fake deps — createSession 은 요청을 그대로 세션으로 반영(멱등가드 미개입 경로). */
function makeDeps(over: Partial<AutopilotSweepDeps> = {}) {
  const created: CreatePaperTradingSessionRequest[] = [];
  const patched: Array<{ sessionId: string; status: string }> = [];
  let seq = 0;
  const deps: AutopilotSweepDeps = {
    screener: async () => okScreener(["100001", "100002", "100003", "100004"]),
    createSession: async (request) => {
      created.push(request);
      return toDetail(
        makeSession({
          id: `created-${seq++}`,
          tickers: request.tickers,
          stocks: request.stocks ?? [],
          initialCash: request.initialCash,
          autopilotRunId: request.autopilotRunId,
        }),
      );
    },
    patchSessionStatus: async (sessionId, status) => {
      patched.push({ sessionId, status });
      return null;
    },
    listSessions: async () => [],
    getSessionDetail: async () => null,
    cliGate: () => ({ ok: true, available: ["claude"], provider: "claude" }),
    ...over,
  };
  return { deps, created, patched };
}

beforeEach(() => {
  resetAutopilotStoreForTest();
});

describe("startAutopilotRun / stopAutopilotRun", () => {
  it("같은 날 두 번 시작해도 런은 하나(멱등)", async () => {
    const first = await startAutopilotRun({ totalCapital: 6_000_000, slotCount: 3 });
    const second = await startAutopilotRun({});
    expect(second.id).toBe(first.id);
    expect(first.perSlotCash).toBe(2_000_000);
    expect(first.slots).toHaveLength(3);
  });

  it("상품 가이드와 오답노트용 모의투자의 실행 목적을 구분해 저장한다", async () => {
    const research = await startAutopilotRun({ purpose: "research" });
    expect(research.purpose).toBe("research");

    resetAutopilotStoreForTest();
    const guide = await startAutopilotRun({ purpose: "guide" });
    expect(guide.purpose).toBe("guide");
  });

  it("중지 — active→stopped, 남의 런은 null", async () => {
    const run = await startAutopilotRun({});
    const stopped = await stopAutopilotRun(run.id);
    expect(stopped?.status).toBe("stopped");
    expect(stopped?.endedAt).not.toBeNull();

    const foreign = makeRun({ owner: "friend-op" });
    seedAutopilotRunForTest(foreign);
    expect(await stopAutopilotRun(foreign.id)).toBeNull();
  });

  it("research 수동 중지는 자식 세션 완료 함수를 함께 호출한다", async () => {
    const run = await startAutopilotRun({ purpose: "research" });
    const completedRunIds: string[] = [];

    const stopped = await stopAutopilotRun(run.id, {
      completeChildSessions: true,
      completeSessions: async (runId) => {
        completedRunIds.push(runId);
        return { runId, completedSessionIds: ["child-1"], alreadyCompletedSessionIds: [] };
      },
    });

    expect(stopped?.status).toBe("stopped");
    expect(completedRunIds).toEqual([run.id]);
  });
});

describe("respondToAutopilotGuide", () => {
  it("원본 주문에서 수행 스냅샷을 만들고 동일 응답 재시도는 멱등 처리한다", async () => {
    const run = makeRun();
    seedAutopilotRunForTest(run);
    const detail = guideDetail(run.id, "BUY");
    const guideId = `${detail.session.id}:${detail.ticks[0].id}:0`;
    const getDetail = async () => detail;

    const first = await respondToAutopilotGuide(run.id, guideId, "performed", getDetail);
    const second = await respondToAutopilotGuide(run.id, guideId, "performed", getDetail);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(Object.keys(run.guideResponses ?? {})).toEqual([guideId]);
    expect(run.guideResponses?.[guideId]).toMatchObject({
      ticker: "100001",
      side: "BUY",
      recommendedPrice: 10_000,
      recommendedQuantity: 10,
      executedQuantity: 10,
      response: "performed",
    });
  });

  it("확정 응답 변경은 conflict, 수행 매수가 없는 SELL은 no_position", async () => {
    const run = makeRun();
    seedAutopilotRunForTest(run);
    const buy = guideDetail(run.id, "BUY");
    const buyId = `${buy.session.id}:${buy.ticks[0].id}:0`;
    await respondToAutopilotGuide(run.id, buyId, "passed", async () => buy);
    expect(await respondToAutopilotGuide(run.id, buyId, "performed", async () => buy)).toEqual({
      ok: false,
      reason: "conflict",
    });

    const sell = guideDetail(run.id, "SELL");
    const sellId = `${sell.session.id}:${sell.ticks[0].id}:0`;
    expect(await respondToAutopilotGuide(run.id, sellId, "performed", async () => sell)).toEqual({
      ok: false,
      reason: "no_position",
    });
  });
});

describe("sweepAutopilotRuns", () => {
  it("프리마켓·정규장 종료 뒤면 -1, 정규장에 active 런이 없으면 0", async () => {
    expect(await sweepAutopilotRuns(PREMARKET, makeDeps().deps)).toBe(-1);
    expect(
      await sweepAutopilotRuns(new Date("2026-07-13T06:35:00Z"), makeDeps().deps),
    ).toBe(-1);
    expect(await sweepAutopilotRuns(MARKET_OPEN, makeDeps().deps)).toBe(0);
  });

  it("빈 슬롯 fill — 스윕당 최대 2개·perSlotCash·autopilotRunId 스탬프·창 dedup", async () => {
    const run = makeRun();
    seedAutopilotRunForTest(run);
    const { deps, created } = makeDeps();

    expect(await sweepAutopilotRuns(MARKET_OPEN, deps)).toBe(1);
    expect(created).toHaveLength(2); // AUTOPILOT_MAX_FILLS_PER_SWEEP.
    expect(created[0].initialCash).toBe(run.perSlotCash);
    expect(created[0].autopilotRunId).toBe(run.id);
    expect(created[0].decisionProvider).toBe("cli-agent");
    expect(run.slots[0].sessionId).toBe("created-0");
    expect(run.slots[1].sessionId).toBe("created-1");
    expect(run.slots[2].sessionId).toBeNull();
    expect(run.rotationLog.filter((e) => e.kind === "fill")).toHaveLength(2);

    // 같은 10분 창 재스윕은 무실행(dedup).
    expect(await sweepAutopilotRuns(MARKET_OPEN, deps)).toBe(0);
  });

  it("남의 런은 스윕하지 않는다(owner 엄격 일치)", async () => {
    seedAutopilotRunForTest(makeRun({ owner: "friend-op" }));
    const { deps, created } = makeDeps();
    expect(await sweepAutopilotRuns(MARKET_OPEN, deps)).toBe(0);
    expect(created).toHaveLength(0);
  });

  it("멱등가드 충돌(남의/수동 세션 반환) — 슬롯 미배정 + 쿨다운", async () => {
    const run = makeRun({ slotCount: 1 });
    seedAutopilotRunForTest(run);
    const { deps } = makeDeps({
      createSession: async (request) =>
        // autopilotRunId 없는 기존 수동 세션이 반환된 상황(멱등가드).
        toDetail(makeSession({ id: "manual-1", tickers: request.tickers, autopilotRunId: undefined })),
    });

    await sweepAutopilotRuns(MARKET_OPEN, deps);
    expect(run.slots[0].sessionId).toBeNull();
    expect(Object.keys(run.cooldownUntilByTicker)).toHaveLength(1);
    expect(run.rotationLog.some((e) => e.kind === "skip" && e.note?.includes("멱등가드"))).toBe(true);
  });

  it("오늘 running 티커(소유자 무관)는 스크리너 제외 집합에 들어간다 — 단 내 슬롯 티커는 제외 안 함", async () => {
    const run = makeRun();
    run.slots[0] = { slotIndex: 0, sessionId: "mine-1", ticker: "100009", filledAt: "2026-07-13T00:30:00.000Z" };
    seedAutopilotRunForTest(run);

    let capturedExclude: ReadonlySet<string> | undefined;
    const { deps } = makeDeps({
      listSessions: async () => [
        makeSession({ id: "mine-1", tickers: ["100009"], stocks: [{ ticker: "100009", name: "내슬롯" }] }),
        makeSession({
          id: "friend-1",
          owner: "friend-op",
          tickers: ["100008"],
          stocks: [{ ticker: "100008", name: "친구세션" }],
        }),
      ],
      getSessionDetail: async (id) =>
        id === "mine-1" ? toDetail(makeSession({ id: "mine-1", tickers: ["100009"], stocks: [{ ticker: "100009", name: "내슬롯" }] })) : null,
      screener: async (options) => {
        capturedExclude = options?.excludeTickers;
        return okScreener(["100009", "100001", "100002"]);
      },
    });

    await sweepAutopilotRuns(MARKET_OPEN, deps);
    expect(capturedExclude?.has("100008")).toBe(true); // 친구 세션 티커 제외.
    expect(capturedExclude?.has("100009")).toBe(false); // 내 슬롯 티커는 랭킹 유지(교체 판정용).
  });

  it("교체 — 랭킹 탈락 flat 슬롯은 완료 patch + 쿨다운 + 같은 스윕 재충원", async () => {
    const run = makeRun({ slotCount: 1 });
    run.slots[0] = { slotIndex: 0, sessionId: "old-1", ticker: "999999", filledAt: "2026-07-13T00:30:00.000Z" };
    seedAutopilotRunForTest(run);
    const { deps, patched } = makeDeps({
      getSessionDetail: async (id) =>
        id === "old-1"
          ? toDetail(makeSession({ id: "old-1", tickers: ["999999"], stocks: [{ ticker: "999999", name: "탈락" }] }))
          : null,
      // 999999 는 랭킹 밖 → 스코어 탈락.
      screener: async () => okScreener(["100001", "100002"]),
    });

    await sweepAutopilotRuns(MARKET_OPEN, deps);
    expect(patched).toEqual([{ sessionId: "old-1", status: "completed" }]);
    expect(run.cooldownUntilByTicker["999999"]).toBeDefined();
    expect(run.slots[0].sessionId).toBe("created-0"); // 회수 후 즉시 재충원.
    expect(run.rotationLog.some((e) => e.kind === "replace")).toBe(true);
  });

  it("스크리너 스냅샷 — 창당 1건, 랭킹(점수 병합)·편입·교체·탈락 전수 기록", async () => {
    const run = makeRun({ slotCount: 1 });
    run.slots[0] = { slotIndex: 0, sessionId: "old-1", ticker: "999999", filledAt: "2026-07-13T00:30:00.000Z" };
    seedAutopilotRunForTest(run);
    const snapshots: AutopilotScreenerSnapshot[] = [];
    const { deps } = makeDeps({
      getSessionDetail: async (id) =>
        id === "old-1"
          ? toDetail(makeSession({ id: "old-1", tickers: ["999999"], stocks: [{ ticker: "999999", name: "탈락" }] }))
          : null,
      screener: async () => okScreener(["100001", "100002"]),
      persistSnapshot: async (s) => {
        snapshots.push(s);
      },
    });

    await sweepAutopilotRuns(MARKET_OPEN, deps);
    expect(snapshots).toHaveLength(1);
    const s = snapshots[0];
    expect(s.id).toBe(`${run.id}:${run.lastSweepWindowStart}`);
    expect(s.status).toBe("ok");
    expect(s.ranking.map((c) => c.ticker)).toEqual(["100001", "100002"]);
    expect(s.ranking[0].finalScore).toBeDefined(); // shortlist 는 최종 점수 병합.
    expect(s.replaced.map((r) => r.ticker)).toEqual(["999999"]);
    expect(s.picks.map((p) => p.ticker)).toEqual(["100001"]);
    expect(s.picks[0].sessionId).toBe("created-0");
  });

  it("스크리너 미가용 — skip 이벤트 + 요약 기록, 슬롯 유지", async () => {
    const run = makeRun({ slotCount: 1 });
    run.slots[0] = { slotIndex: 0, sessionId: "old-1", ticker: "100001", filledAt: "2026-07-13T00:30:00.000Z" };
    seedAutopilotRunForTest(run);
    const { deps, patched } = makeDeps({
      getSessionDetail: async () => toDetail(makeSession({ id: "old-1" })),
      screener: async () => ({ status: "unavailable", reason: "KIS 미설정" }),
    });

    await sweepAutopilotRuns(MARKET_OPEN, deps);
    expect(patched).toHaveLength(0);
    expect(run.slots[0].sessionId).toBe("old-1");
    expect(run.lastScreenerSummary?.unavailableReason).toContain("KIS");
    expect(run.rotationLog.some((e) => e.kind === "skip")).toBe(true);
  });
});

describe("closeOutAutopilotRuns", () => {
  it("이전 날 active 런은 시간대 무관 완료(크로스데이), 오늘 런은 마감 후에만", async () => {
    const stale = makeRun({ startedAt: "2026-07-10T00:00:00.000Z" });
    const today = makeRun({ startedAt: "2026-07-13T00:00:00.000Z" });
    seedAutopilotRunForTest(stale);
    seedAutopilotRunForTest(today);

    expect(await closeOutAutopilotRuns(MARKET_OPEN)).toBe(1); // stale 만.
    expect(stale.status).toBe("completed");
    expect(today.status).toBe("active");

    expect(await closeOutAutopilotRuns(AFTER_CLOSE)).toBe(1); // 오늘 런.
    expect(today.status).toBe("completed");
  });

  it("남의 런은 마감 처리하지 않는다", async () => {
    const foreign = makeRun({ owner: "friend-op", startedAt: "2026-07-10T00:00:00.000Z" });
    seedAutopilotRunForTest(foreign);
    expect(await closeOutAutopilotRuns(AFTER_CLOSE)).toBe(0);
    expect(foreign.status).toBe("active");
  });
});
