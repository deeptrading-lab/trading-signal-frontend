/**
 * 틱 자가채점 라벨링 엔진 테스트 — intraday-decision-overhaul PR-2 (AC-9).
 *
 * - labelTick: 합성 분봉으로 WIN/LOSS/동시터치 손절우선/만료 NEUTRAL/레벨·스냅샷 없음 UNRESOLVED,
 *   HOLD 반사실(스냅샷 레벨), 결정가 우선, 15:20 경계·당일 경계·룩어헤드 제외.
 * - labelSessionTicks: Supabase upsert(on_conflict=tick_id·merge-duplicates) 멱등, (ticker,일자)당
 *   분봉 1회 페치, KIS 미설정 skip(무저장).
 * - fetchLabeledTickIds: run 라우트 dedupe 의 tick_id 집합 조회.
 * - bucketizeLabels / summarizeLabels: 출처×액션·점수대 밴드 집계 수학.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bucketizeLabels,
  deriveTickLabelSource,
  fetchLabeledTickIds,
  isTickLabelStoreConfigured,
  labelSessionTicks,
  labelTick,
  scheduleSessionTickLabeling,
  summarizeLabels,
} from "@/lib/server/intraday/tickLabels";
import { isKisConfigured } from "@/lib/api/kis";
import {
  fetchMinuteCandlesForDate,
  fetchTodayMinuteCandles,
} from "@/lib/api/kis/minuteChartChunked";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { IntradaySnapshot } from "@/lib/types/intraday/intradayDecision";
import type { IntradayTickLabelRow } from "@/lib/types/intraday/tickLabels";
import type {
  PaperTradingDecision,
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

vi.mock("@/lib/api/kis", () => ({ isKisConfigured: vi.fn(() => true) }));
vi.mock("@/lib/api/kis/minuteChartChunked", () => ({
  fetchTodayMinuteCandles: vi.fn(async () => []),
  fetchMinuteCandlesForDate: vi.fn(async () => []),
}));

const mockKisConfigured = vi.mocked(isKisConfigured);
const mockFetchForDate = vi.mocked(fetchMinuteCandlesForDate);
const mockFetchToday = vi.mocked(fetchTodayMinuteCandles);

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

/** 분봉 1개 — date 는 "YYYY-MM-DDTHH:mm"(KST 사전식 정렬 키). */
function bar(stamp: string, high: number, low: number, close: number): StockMinuteCandle {
  return { date: stamp, open: close, high, low, close, volume: 100 };
}

function makeSnapshot(over: Partial<IntradaySnapshot> = {}): IntradaySnapshot {
  return {
    basePrice: 10_000,
    signal: { score: 55, action: "HOLD", confidence: 0.5, regime: 0, axes: [], asOf: "2026-07-08" },
    levels: {
      lastClose: 10_000,
      boxHigh: 10_200,
      boxLow: 9_800,
      tpPrice: 10_300,
      slPrice: 9_850,
      tpSource: "swing",
      slSource: "swing",
      rrr: 2,
      tpPct: 3,
      slPct: -1.5,
      ...(over.levels ?? {}),
    },
    structureEvent: null,
    ...over,
  };
}

/** KST "YYYY-MM-DDTHH:mm" → UTC ISO — tickWindowStart 저장 형식. */
function kstToIso(kstStamp: string): string {
  return new Date(`${kstStamp}:00+09:00`).toISOString();
}

function makeTick(over: {
  id?: string;
  sessionId?: string;
  tickIndex?: number;
  windowKst?: string;
  decision?: Partial<PaperTradingDecision>;
}): PaperTradingTick {
  const decision: PaperTradingDecision = {
    action: "HOLD",
    targetAllocationPct: 0,
    targetAllocations: [],
    confidence: "MEDIUM",
    rationale: "테스트",
    riskNotes: [],
    targetPrice: null,
    invalidationPrice: null,
    intradaySnapshot: makeSnapshot(),
    source: "cli-agent",
    ...over.decision,
  };
  const iso = kstToIso(over.windowKst ?? "2026-07-08T10:00");
  return {
    id: over.id ?? "tick-1",
    sessionId: over.sessionId ?? "session-1",
    tickIndex: over.tickIndex ?? 0,
    status: "decided",
    triggeredBy: "auto",
    tickWindowStart: iso,
    pricedAt: iso,
    priceFreshnessSeconds: 0,
    portfolioValueBefore: 0,
    portfolioValueAfter: 0,
    cashBefore: 0,
    cashAfter: 0,
    returnPctAfter: 0,
    decision,
    priceSnapshot: [],
    orders: [],
    rationale: "테스트",
    guardAdjustments: [],
    errorMessage: null,
    createdAt: iso,
  };
}

function makeSession(over: Partial<PaperTradingSession> = {}): PaperTradingSession {
  return {
    id: "session-1",
    name: "단타 모의 · 테스트",
    status: "completed",
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
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: "2026-07-08T00:00:00.000Z",
    endedAt: null,
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T07:00:00.000Z",
    ...over,
  };
}

// ─── labelTick(순수) ─────────────────────────────────────────────────────────

describe("labelTick — 삼중배리어 라벨(entry=basePrice 10000, tp=10300, sl=9850)", () => {
  it("TP 먼저 도달 → WIN + returnPct/exitMinutes", () => {
    const tick = makeTick({ windowKst: "2026-07-08T10:00" });
    const result = labelTick(tick, [
      bar("2026-07-08T10:05", 10_100, 9_950, 10_050),
      bar("2026-07-08T10:10", 10_350, 10_000, 10_320),
    ]);
    expect(result.label).toBe("WIN");
    expect(result.returnPct).toBeCloseTo(3, 6);
    expect(result.exitMinutes).toBe(10);
    expect(result.tpFrom).toBe("levels");
  });

  it("SL 먼저 터치 → LOSS", () => {
    const tick = makeTick({});
    const result = labelTick(tick, [bar("2026-07-08T10:05", 10_050, 9_800, 9_900)]);
    expect(result.label).toBe("LOSS");
    expect(result.returnPct).toBeCloseTo(-1.5, 6);
    expect(result.exitMinutes).toBe(5);
  });

  it("같은 봉에서 TP·SL 동시 터치 → 손절 우선(LOSS, tripleBarrier 보수 규칙)", () => {
    const tick = makeTick({});
    const result = labelTick(tick, [bar("2026-07-08T10:05", 10_400, 9_800, 10_100)]);
    expect(result.label).toBe("LOSS");
  });

  it("15:20 까지 미도달 → 마지막 봉 종가 NEUTRAL, 15:20 초과 봉은 제외", () => {
    const tick = makeTick({});
    const result = labelTick(tick, [
      bar("2026-07-08T10:05", 10_100, 9_950, 10_050),
      bar("2026-07-08T15:15", 10_150, 9_990, 10_100),
      // 15:20 초과 봉의 TP 터치는 무시돼야 한다(강제 청산 창 이후).
      bar("2026-07-08T15:25", 10_500, 10_000, 10_400),
    ]);
    expect(result.label).toBe("NEUTRAL");
    expect(result.returnPct).toBeCloseTo(1, 6);
    expect(result.exitMinutes).toBe(315);
  });

  it("판단 스탬프 이전/같은 시각 봉은 제외(룩어헤드 방지) — 이후 봉만 채점", () => {
    const tick = makeTick({ windowKst: "2026-07-08T10:00" });
    const result = labelTick(tick, [
      bar("2026-07-08T09:55", 99_999, 9_999, 10_000), // 이전 봉 TP 터치 무시
      bar("2026-07-08T10:00", 99_999, 9_999, 10_000), // 판단이 속한 진행 중 봉 무시
      bar("2026-07-08T10:05", 10_050, 9_800, 9_900),
    ]);
    expect(result.label).toBe("LOSS");
  });

  it("다른 날 봉만 있으면 UNRESOLVED(당일 경계)", () => {
    const tick = makeTick({ windowKst: "2026-07-08T10:00" });
    const result = labelTick(tick, [bar("2026-07-07T10:05", 10_400, 9_800, 10_100)]);
    expect(result.label).toBe("UNRESOLVED");
  });

  it("판단 이후 봉이 없으면 UNRESOLVED", () => {
    const tick = makeTick({ windowKst: "2026-07-08T15:20" });
    expect(labelTick(tick, [bar("2026-07-08T15:15", 10_100, 9_950, 10_050)]).label).toBe(
      "UNRESOLVED",
    );
    expect(labelTick(tick, []).label).toBe("UNRESOLVED");
  });

  it("TP/SL 레벨이 전혀 없으면 UNRESOLVED", () => {
    const tick = makeTick({
      decision: {
        targetPrice: null,
        invalidationPrice: null,
        intradaySnapshot: makeSnapshot({
          levels: { ...makeSnapshot().levels, tpPrice: null, slPrice: null },
        }),
      },
    });
    const result = labelTick(tick, [bar("2026-07-08T10:05", 10_400, 9_800, 10_100)]);
    expect(result.label).toBe("UNRESOLVED");
    expect(result.reason).toContain("레벨 없음");
  });

  it("스냅샷 없는 구버전 틱은 UNRESOLVED", () => {
    const tick = makeTick({ decision: { intradaySnapshot: undefined } });
    expect(labelTick(tick, [bar("2026-07-08T10:05", 10_400, 9_800, 10_100)]).label).toBe(
      "UNRESOLVED",
    );
  });

  it("롱 기준 역전 레벨(TP≤진입가)은 UNRESOLVED(쓰레기 라벨 방지)", () => {
    const tick = makeTick({
      decision: {
        intradaySnapshot: makeSnapshot({
          levels: { ...makeSnapshot().levels, tpPrice: 9_900, slPrice: 9_850 },
        }),
      },
    });
    expect(labelTick(tick, [bar("2026-07-08T10:05", 10_400, 9_800, 10_100)]).label).toBe(
      "UNRESOLVED",
    );
  });

  it("HOLD 틱 반사실 — 결정가(null) 대신 스냅샷 구조 레벨로 라벨", () => {
    const tick = makeTick({ decision: { action: "HOLD", targetPrice: null, invalidationPrice: null } });
    const result = labelTick(tick, [bar("2026-07-08T10:05", 10_350, 10_000, 10_320)]);
    expect(result.label).toBe("WIN");
    expect(result.tpFrom).toBe("levels");
    expect(result.slFrom).toBe("levels");
  });

  it("LLM 결정가가 있으면 스냅샷 레벨보다 우선", () => {
    const tick = makeTick({
      decision: { action: "BUY", targetPrice: 10_200, invalidationPrice: 9_900 },
    });
    // high 10250 — 결정 TP(10200)엔 닿지만 구조 TP(10300)엔 못 닿는다.
    const result = labelTick(tick, [bar("2026-07-08T10:05", 10_250, 10_000, 10_220)]);
    expect(result.label).toBe("WIN");
    expect(result.returnPct).toBeCloseTo(2, 6);
    expect(result.tpFrom).toBe("decision");
    expect(result.slFrom).toBe("decision");
  });
});

describe("deriveTickLabelSource — judgeModel 존재 여부로 출처 복원", () => {
  it("judgeModel 있음 → intraday-cli / 없음 → intraday-fallback", () => {
    const cli = makeTick({ decision: { judgeModel: "claude-sonnet-5" } }).decision;
    const fallback = makeTick({}).decision;
    expect(deriveTickLabelSource(cli)).toBe("intraday-cli");
    expect(deriveTickLabelSource(fallback)).toBe("intraday-fallback");
  });
});

// ─── Supabase 연동(labelSessionTicks · fetchLabeledTickIds · summarizeLabels) ─

type FetchCall = { url: string; init?: RequestInit };

describe("labelSessionTicks — 멱등 upsert + 페치 dedupe + 미설정 skip", () => {
  const ORIGINAL_URL = process.env.SUPABASE_URL;
  const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let calls: FetchCall[] = [];

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    mockKisConfigured.mockReturnValue(true);
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return new Response("[]", { status: 201 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_URL === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = ORIGINAL_URL;
    if (ORIGINAL_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY;
  });

  it("isTickLabelStoreConfigured — env 유무로 판별", () => {
    expect(isTickLabelStoreConfigured()).toBe(true);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(isTickLabelStoreConfigured()).toBe(false);
  });

  it("(ticker, 일자)당 분봉 1회 페치 후 on_conflict=tick_id merge-duplicates 로 upsert", async () => {
    mockFetchForDate.mockResolvedValue([
      bar("2026-07-08T10:05", 10_350, 10_000, 10_320), // t1(10:00) → WIN
      bar("2026-07-08T10:10", 10_100, 9_800, 9_900), // t2(10:05) → LOSS
    ]);
    const ticks = [
      makeTick({
        id: "t1",
        windowKst: "2026-07-08T10:00",
        decision: { convictionScore: 67 },
      }),
      makeTick({ id: "t2", tickIndex: 1, windowKst: "2026-07-08T10:05" }),
    ];
    const result = await labelSessionTicks(makeSession(), ticks);

    expect(result).toEqual({ labeled: 2, unresolved: 0, skipped: false });
    // 같은 일자 2틱 → 분봉 페치는 1회(과거 일자라 fetchMinuteCandlesForDate).
    expect(mockFetchForDate).toHaveBeenCalledTimes(1);
    expect(mockFetchForDate).toHaveBeenCalledWith("005930", "20260708", 5);
    expect(mockFetchToday).not.toHaveBeenCalled();

    const posts = calls.filter((c) => c.init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toContain("/rest/v1/intraday_tick_labels?on_conflict=tick_id");
    const headers = posts[0].init?.headers as Record<string, string>;
    expect(headers.Prefer).toContain("resolution=merge-duplicates");
    const body = JSON.parse(String(posts[0].init?.body)) as Array<Record<string, unknown>>;
    expect(body.map((row) => row.tick_id)).toEqual(["t1", "t2"]);
    expect(body[0]).toMatchObject({
      session_id: "session-1",
      ticker: "005930",
      action: "HOLD",
      source: "intraday-fallback",
      label: "WIN",
    });
    // payload — 라벨 단독 캘리브레이션이 가능하도록 원본 conviction도 함께 실린다.
    expect(body[0].payload).toMatchObject({ signalScore: 55, conviction: 67, timeframe: 5 });

    // 재실행(멱등) — 같은 tick_id 로 다시 upsert 해도 merge-duplicates 라 안전.
    await labelSessionTicks(makeSession(), ticks);
    const posts2 = calls.filter((c) => c.init?.method === "POST");
    expect(posts2).toHaveLength(2);
    const body2 = JSON.parse(String(posts2[1].init?.body)) as Array<Record<string, unknown>>;
    expect(body2.map((row) => row.tick_id)).toEqual(["t1", "t2"]);
  });

  it("분봉 조회 실패(과거 조회 불가)는 UNRESOLVED 로 영속(기대 동작)", async () => {
    mockFetchForDate.mockRejectedValue(new Error("KIS 과거 분봉 없음"));
    const result = await labelSessionTicks(makeSession(), [makeTick({ id: "t-old" })]);
    expect(result).toEqual({ labeled: 0, unresolved: 1, skipped: false });
    const posts = calls.filter((c) => c.init?.method === "POST");
    expect(posts).toHaveLength(1);
    const body = JSON.parse(String(posts[0].init?.body)) as Array<Record<string, unknown>>;
    expect(body[0]).toMatchObject({ tick_id: "t-old", label: "UNRESOLVED", return_pct: null });
  });

  it("KIS 미설정 → skip(UNRESOLVED 오염 없이 무저장·never-throw)", async () => {
    mockKisConfigured.mockReturnValue(false);
    const result = await labelSessionTicks(makeSession(), [makeTick({})]);
    expect(result).toEqual({ labeled: 0, unresolved: 0, skipped: true });
    expect(calls).toHaveLength(0);
  });

  it("Supabase 미설정 → skip", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await labelSessionTicks(makeSession(), [makeTick({})]);
    expect(result).toEqual({ labeled: 0, unresolved: 0, skipped: true });
    expect(calls).toHaveLength(0);
  });

  it("cli-agent 외 provider 세션은 skip", async () => {
    const result = await labelSessionTicks(makeSession({ decisionProvider: "mock" }), [
      makeTick({}),
    ]);
    expect(result).toEqual({ labeled: 0, unresolved: 0, skipped: true });
    expect(calls).toHaveLength(0);
  });

  it("scheduleSessionTickLabeling — fire-and-forget + 프로세스당 세션 1회 가드", async () => {
    mockFetchForDate.mockResolvedValue([bar("2026-07-08T10:05", 10_350, 10_000, 10_320)]);
    const session = makeSession({ id: "session-once" });
    const ticks = [makeTick({ id: "t-once", sessionId: "session-once" })];

    const marketOpen = new Date("2026-07-08T01:00:00Z");
    scheduleSessionTickLabeling(session, ticks, marketOpen);
    await vi.waitFor(() => {
      expect(calls.filter((c) => c.init?.method === "POST")).toHaveLength(1);
    });

    // 중복 완료 전이 — 같은 세션은 다시 라벨링하지 않는다.
    scheduleSessionTickLabeling(session, ticks, marketOpen);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls.filter((c) => c.init?.method === "POST")).toHaveLength(1);

    // cli-agent 외 provider 는 스케줄 자체가 없다.
    scheduleSessionTickLabeling(
      makeSession({ id: "session-mock", decisionProvider: "mock" }),
      ticks,
      marketOpen,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls.filter((c) => c.init?.method === "POST")).toHaveLength(1);
  });

  it("scheduleSessionTickLabeling — 15:40 이후에는 KIS/Supabase 후속 호출을 만들지 않는다", async () => {
    mockFetchForDate.mockClear();
    mockFetchToday.mockClear();
    const session = makeSession({ id: "session-after-close" });
    const ticks = [makeTick({ id: "t-after-close", sessionId: session.id })];

    scheduleSessionTickLabeling(session, ticks, new Date("2026-07-08T06:40:00Z"));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(calls).toHaveLength(0);
    expect(mockFetchForDate).not.toHaveBeenCalled();
    expect(mockFetchToday).not.toHaveBeenCalled();
  });

  it("fetchLabeledTickIds — 기존 라벨 tick_id 집합(run 라우트 dedupe)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify([{ tick_id: "t1" }, { tick_id: "t2" }]), {
          status: 200,
        });
      }),
    );
    const ids = await fetchLabeledTickIds(["session-1", "session-2"]);
    expect(ids).toEqual(new Set(["t1", "t2"]));
    expect(calls[0].url).toContain("select=tick_id");
    expect(calls[0].url).toContain("session_id=in.(session-1,session-2)");
  });

  it("summarizeLabels — 페이지 걷기 + 집계(numeric 문자열 정규화 포함)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify([
            {
              tick_id: "t1",
              session_id: "s1",
              ticker: "005930",
              action: "HOLD",
              source: "intraday-cli",
              label: "WIN",
              return_pct: "3.0", // PostgREST numeric 은 문자열일 수 있다.
              payload: { signalScore: 62 },
            },
            {
              tick_id: "t2",
              session_id: "s1",
              ticker: "005930",
              action: "HOLD",
              source: "intraday-cli",
              label: "LOSS",
              return_pct: -1.5,
              payload: { signalScore: 45 },
            },
          ]),
          { status: 200 },
        );
      }),
    );
    const summary = await summarizeLabels();
    expect(summary.configured).toBe(true);
    expect(summary.total).toBe(2);
    expect(summary.buckets).toHaveLength(1);
    expect(summary.buckets[0]).toMatchObject({
      source: "intraday-cli",
      action: "HOLD",
      counts: { WIN: 1, LOSS: 1, NEUTRAL: 0, UNRESOLVED: 0 },
      total: 2,
    });
    expect(summary.buckets[0].avgReturnPct).toBeCloseTo(0.75, 6);
    expect(summary.scoreBands.map((b) => b.band)).toEqual(["b40to60", "gte60"]);
  });

  it("summarizeLabels — Supabase 미설정이면 configured:false + 빈 집계", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const summary = await summarizeLabels();
    expect(summary).toMatchObject({ configured: false, total: 0, buckets: [], scoreBands: [] });
  });
});

// ─── bucketizeLabels(순수 집계) ──────────────────────────────────────────────

describe("bucketizeLabels — 출처×액션 버킷 + 점수대 밴드 수학", () => {
  function row(over: Partial<IntradayTickLabelRow>): IntradayTickLabelRow {
    return {
      tickId: "t",
      sessionId: "s",
      ticker: "005930",
      action: "HOLD",
      source: "intraday-cli",
      label: "WIN",
      returnPct: 1,
      payload: null,
      ...over,
    };
  }

  it("카운트·평균수익률(UNRESOLVED 제외)·정렬 순서", () => {
    const { buckets } = bucketizeLabels([
      row({ tickId: "a", action: "BUY", label: "WIN", returnPct: 3 }),
      row({ tickId: "b", action: "BUY", label: "LOSS", returnPct: -1.5 }),
      row({ tickId: "c", action: "BUY", label: "UNRESOLVED", returnPct: null }),
      row({ tickId: "d", source: "intraday-fallback", action: "HOLD", label: "NEUTRAL", returnPct: 0.5 }),
    ]);
    expect(buckets).toHaveLength(2);
    // 정렬 — LLM 경로(intraday-cli) 먼저, 액션은 BUY 먼저.
    expect(buckets[0]).toMatchObject({
      source: "intraday-cli",
      action: "BUY",
      counts: { WIN: 1, LOSS: 1, NEUTRAL: 0, UNRESOLVED: 1 },
      total: 3,
    });
    expect(buckets[0].avgReturnPct).toBeCloseTo(0.75, 6); // (3 - 1.5) / 2 — UNRESOLVED 분모 제외
    expect(buckets[1]).toMatchObject({ source: "intraday-fallback", action: "HOLD", total: 1 });
    expect(buckets[1].avgReturnPct).toBeCloseTo(0.5, 6);
  });

  it("점수대 밴드 — <40 / 40~60 / 60+ 경계, 점수 없는 행은 밴드 제외", () => {
    const { scoreBands } = bucketizeLabels([
      row({ tickId: "a", label: "LOSS", returnPct: -1, payload: { signalScore: 39.9 } as never }),
      row({ tickId: "b", label: "NEUTRAL", returnPct: 0, payload: { signalScore: 40 } as never }),
      row({ tickId: "c", label: "WIN", returnPct: 2, payload: { signalScore: 60 } as never }),
      row({ tickId: "d", label: "WIN", returnPct: 4, payload: null }), // 밴드 집계 제외
    ]);
    expect(scoreBands.map((b) => b.band)).toEqual(["lt40", "b40to60", "gte60"]);
    expect(scoreBands[0].counts.LOSS).toBe(1);
    expect(scoreBands[1].counts.NEUTRAL).toBe(1);
    expect(scoreBands[2].counts.WIN).toBe(1);
    expect(scoreBands[2].avgReturnPct).toBeCloseTo(2, 6);
  });

  it("확정 라벨이 없으면 avgReturnPct=null", () => {
    const { buckets } = bucketizeLabels([row({ label: "UNRESOLVED", returnPct: null })]);
    expect(buckets[0].avgReturnPct).toBeNull();
  });
});
