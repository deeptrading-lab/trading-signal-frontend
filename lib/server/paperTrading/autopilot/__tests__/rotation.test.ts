import { describe, expect, it } from "vitest";
import {
  buildSlotSessionView,
  isTickerInCooldown,
  kstHhmmOf,
  planRotation,
  type AutopilotSlotSessionView,
} from "@/lib/server/paperTrading/autopilot/rotation";
import type {
  AutopilotCandidate,
  AutopilotRun,
} from "@/lib/types/paperTrading/autopilot";
import type {
  PaperTradingSession,
  PaperTradingSessionDetail,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

/** KST 10:00 월요일(2026-07-13) — fill 창(09:05~14:00) 안. */
const IN_WINDOW = new Date("2026-07-13T01:00:00Z");
/** KST 14:30 — fill 창 밖(신규 진입 마감 후). */
const AFTER_WINDOW = new Date("2026-07-13T05:30:00Z");
/** KST 09:04 — 첫 fill 허용(09:05) 직전. */
const BEFORE_WINDOW = new Date("2026-07-13T00:04:00Z");

function candidate(ticker: string, over: Partial<AutopilotCandidate> = {}): AutopilotCandidate {
  return {
    ticker,
    name: `종목${ticker}`,
    sources: ["volume"],
    price: 10_000,
    changePercent: 3,
    score1: 0.5,
    score2: 0.5,
    finalScore: 0.5,
    ...over,
  };
}

/** 1차 랭킹 15종목(임계 12 밖 검증용) — 100001(1위)…100015(15위). */
function ranking15(): AutopilotCandidate[] {
  return Array.from({ length: 15 }, (_, i) =>
    candidate(`1000${String(i + 1).padStart(2, "0")}`, { score1: 1 - i * 0.05 }),
  );
}

function makeRun(over: Partial<AutopilotRun> = {}): AutopilotRun {
  const nowIso = "2026-07-13T00:00:00.000Z";
  return {
    id: "run-1",
    status: "active",
    owner: "me",
    totalCapital: 10_000_000,
    slotCount: 3,
    perSlotCash: 3_333_333,
    riskMode: "balanced",
    slots: [
      { slotIndex: 0, sessionId: null, ticker: null, filledAt: null },
      { slotIndex: 1, sessionId: null, ticker: null, filledAt: null },
      { slotIndex: 2, sessionId: null, ticker: null, filledAt: null },
    ],
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

function view(
  sessionId: string,
  ticker: string,
  over: Partial<AutopilotSlotSessionView> = {},
): AutopilotSlotSessionView {
  return {
    sessionId,
    ticker,
    status: "running",
    hasPosition: false,
    consecutiveNoOrderTicks: 0,
    lastConvictionScore: null,
    ...over,
  };
}

function filledSlot(slotIndex: number, sessionId: string, ticker: string) {
  return { slotIndex, sessionId, ticker, filledAt: "2026-07-13T00:10:00.000Z" };
}

describe("planRotation — 교체 판정", () => {
  it("포지션 보유 슬롯은 랭킹 밖이어도 절대 교체하지 않는다", () => {
    const run = makeRun({ slots: [filledSlot(0, "s1", "999999")] });
    const plan = planRotation({
      run,
      slotViews: new Map([["s1", view("s1", "999999", { hasPosition: true })]]),
      stage1Ranking: ranking15(), // 999999 는 랭킹 밖.
      fillRanking: ranking15(),
      now: IN_WINDOW,
    });
    expect(plan.replacements).toEqual([]);
  });

  it("flat 슬롯 — 랭킹 임계(12위) 밖이면 교체, 안이면 유지", () => {
    const run = makeRun({
      slots: [filledSlot(0, "s1", "100001"), filledSlot(1, "s2", "100015")],
    });
    const plan = planRotation({
      run,
      slotViews: new Map([
        ["s1", view("s1", "100001")], // 1위 — 유지.
        ["s2", view("s2", "100015")], // 15위 — 탈락.
      ]),
      stage1Ranking: ranking15(),
      fillRanking: [],
      now: IN_WINDOW,
    });
    expect(plan.replacements.map((r) => r.sessionId)).toEqual(["s2"]);
    expect(plan.replacements[0].reason).toContain("스코어 탈락");
  });

  it("flat + 정체(무주문 6틱·conviction ≤55) → 교체 / conviction 높으면 진입 임박으로 유예", () => {
    const run = makeRun({
      slots: [filledSlot(0, "s1", "100001"), filledSlot(1, "s2", "100002")],
    });
    const plan = planRotation({
      run,
      slotViews: new Map([
        ["s1", view("s1", "100001", { consecutiveNoOrderTicks: 6, lastConvictionScore: 40 })],
        ["s2", view("s2", "100002", { consecutiveNoOrderTicks: 9, lastConvictionScore: 62 })],
      ]),
      stage1Ranking: ranking15(),
      fillRanking: [],
      now: IN_WINDOW,
    });
    expect(plan.replacements.map((r) => r.sessionId)).toEqual(["s1"]);
    expect(plan.replacements[0].reason).toContain("정체");
  });

  it("랭킹이 비면(스크리너 미가용) 교체 판정 자체를 하지 않는다", () => {
    const run = makeRun({ slots: [filledSlot(0, "s1", "999999")] });
    const plan = planRotation({
      run,
      slotViews: new Map([
        ["s1", view("s1", "999999", { consecutiveNoOrderTicks: 10, lastConvictionScore: 0 })],
      ]),
      stage1Ranking: [],
      fillRanking: [],
      now: IN_WINDOW,
    });
    expect(plan.replacements).toEqual([]);
    expect(plan.fills).toEqual([]);
  });

  it("fill 창 밖(14:00 이후)에는 교체 회수도 하지 않는다 — 회수해도 못 채운다", () => {
    const run = makeRun({ slots: [filledSlot(0, "s1", "100015")] });
    const plan = planRotation({
      run,
      slotViews: new Map([["s1", view("s1", "100015")]]),
      stage1Ranking: ranking15(),
      fillRanking: ranking15(),
      now: AFTER_WINDOW,
    });
    expect(plan.replacements).toEqual([]);
    expect(plan.fills).toEqual([]);
  });
});

describe("planRotation — fill", () => {
  it("빈 슬롯을 최종 점수순으로 채우되 스윕당 최대 2개", () => {
    const plan = planRotation({
      run: makeRun(),
      slotViews: new Map(),
      stage1Ranking: ranking15(),
      fillRanking: [
        candidate("100003", { finalScore: 0.9 }),
        candidate("100001", { finalScore: 0.8 }),
        candidate("100002", { finalScore: 0.7 }),
      ],
      now: IN_WINDOW,
    });
    expect(plan.fills).toHaveLength(2); // AUTOPILOT_MAX_FILLS_PER_SWEEP 기본 2.
    expect(plan.fills.map((f) => f.candidate.ticker)).toEqual(["100003", "100001"]);
    expect(plan.fills.map((f) => f.slotIndex)).toEqual([0, 1]);
  });

  it("쿨다운·현재 슬롯 중복·finalScore 미산출 후보는 fill 에서 제외", () => {
    const run = makeRun({
      slots: [
        filledSlot(0, "s1", "100001"),
        { slotIndex: 1, sessionId: null, ticker: null, filledAt: null },
        { slotIndex: 2, sessionId: null, ticker: null, filledAt: null },
      ],
      cooldownUntilByTicker: { "100002": "2026-07-13T02:00:00.000Z" }, // 창 내 미래 = 쿨다운 중.
    });
    const plan = planRotation({
      run,
      slotViews: new Map([["s1", view("s1", "100001", { hasPosition: true })]]),
      stage1Ranking: ranking15(),
      fillRanking: [
        candidate("100001", { finalScore: 0.9 }), // 슬롯 중복.
        candidate("100002", { finalScore: 0.8 }), // 쿨다운.
        candidate("100003", { finalScore: undefined, score2: undefined }), // 2차 미산출.
        candidate("100004", { finalScore: 0.6 }),
      ],
      now: IN_WINDOW,
    });
    expect(plan.fills.map((f) => f.candidate.ticker)).toEqual(["100004"]);
  });

  it("09:05 이전에는 fill 하지 않는다(skip 사유 기록)", () => {
    const plan = planRotation({
      run: makeRun(),
      slotViews: new Map(),
      stage1Ranking: ranking15(),
      fillRanking: ranking15(),
      now: BEFORE_WINDOW,
    });
    expect(plan.fills).toEqual([]);
    expect(plan.events.some((e) => e.kind === "skip" && e.note?.includes("fill 창 밖"))).toBe(true);
  });

  it("reconcile — 외부에서 completed 된 슬롯 세션은 비우고 같은 스윕에서 다시 채운다", () => {
    const run = makeRun({ slots: [filledSlot(0, "s1", "100001")] });
    const plan = planRotation({
      run,
      slotViews: new Map([["s1", view("s1", "100001", { status: "completed" })]]),
      stage1Ranking: ranking15(),
      fillRanking: [candidate("100005", { finalScore: 0.9 })],
      now: IN_WINDOW,
    });
    expect(plan.reconciled.map((r) => r.sessionId)).toEqual(["s1"]);
    expect(plan.fills.map((f) => f.slotIndex)).toEqual([0]);
  });
});

describe("buildSlotSessionView", () => {
  const iso = "2026-07-13T01:00:00.000Z";

  function tick(over: Partial<PaperTradingTick>): PaperTradingTick {
    return {
      id: "t",
      sessionId: "s1",
      tickIndex: 0,
      status: "executed",
      triggeredBy: "auto",
      tickWindowStart: iso,
      pricedAt: iso,
      priceFreshnessSeconds: 0,
      portfolioValueBefore: 0,
      portfolioValueAfter: 0,
      cashBefore: 0,
      cashAfter: 0,
      returnPctAfter: 0,
      decision: {
        action: "HOLD",
        targetAllocationPct: 0,
        targetAllocations: [],
        confidence: "LOW",
        rationale: "",
        riskNotes: [],
        source: "cli-agent",
      },
      priceSnapshot: [],
      orders: [],
      rationale: "",
      guardAdjustments: [],
      errorMessage: null,
      createdAt: iso,
      ...over,
    };
  }

  function detail(ticks: PaperTradingTick[], positions: PaperTradingSessionDetail["positions"] = []) {
    const session: PaperTradingSession = {
      id: "s1",
      name: "테스트",
      status: "running",
      tickers: ["100001"],
      stocks: [{ ticker: "100001", name: "종목" }],
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
      mode: "live-paper",
      lastTickWindowStart: null,
      startedAt: iso,
      endedAt: null,
      createdAt: iso,
      updatedAt: iso,
    };
    return { session, positions, ticks, equityCurve: [], latestDecision: null };
  }

  it("연속 무주문 카운트 — risk 틱은 제외하고 주문 틱에서 멈춘다", () => {
    const order = {
      ticker: "100001",
      name: "종목",
      side: "BUY" as const,
      quantity: 1,
      price: 10_000,
      notional: 10_000,
      reason: "진입",
    };
    const result = buildSlotSessionView(
      detail([
        tick({ orders: [order] }), // 주문 틱 — 여기서 카운트 중단.
        tick({}),
        tick({ triggeredBy: "risk" }), // 리스크 틱 — 카운트 제외.
        tick({}),
        tick({}),
      ]),
    );
    expect(result.consecutiveNoOrderTicks).toBe(3);
  });

  it("conviction 은 가장 최근 기록값, 포지션은 1주 이상 보유 여부", () => {
    const result = buildSlotSessionView(
      detail(
        [
          tick({ decision: { ...tick({}).decision, convictionScore: 70 } }),
          tick({}), // 미기록 — 건너뛰고 70 을 읽는다.
        ],
        [
          {
            ticker: "100001",
            name: "종목",
            quantity: 2,
            avgEntryPrice: 10_000,
            lastPrice: 10_000,
            marketValue: 20_000,
            unrealizedPnl: 0,
            unrealizedPnlPct: 0,
            allocationPct: 2,
            updatedAt: iso,
          },
        ],
      ),
    );
    expect(result.lastConvictionScore).toBe(70);
    expect(result.hasPosition).toBe(true);
  });
});

describe("시간 헬퍼", () => {
  it("kstHhmmOf — UTC→KST 변환", () => {
    expect(kstHhmmOf(new Date("2026-07-13T01:00:00Z"))).toBe("10:00");
    expect(kstHhmmOf(new Date("2026-07-13T23:30:00Z"))).toBe("08:30"); // 익일 아침.
  });

  it("isTickerInCooldown — 만료 전 true, 만료 후 false", () => {
    const run = makeRun({ cooldownUntilByTicker: { "100001": "2026-07-13T01:30:00.000Z" } });
    expect(isTickerInCooldown(run, "100001", new Date("2026-07-13T01:00:00Z"))).toBe(true);
    expect(isTickerInCooldown(run, "100001", new Date("2026-07-13T02:00:00Z"))).toBe(false);
    expect(isTickerInCooldown(run, "999999", new Date("2026-07-13T01:00:00Z"))).toBe(false);
  });
});
