import { describe, expect, it } from "vitest";
import {
  createPaperTradingSession,
  listPaperTradingSessions,
  resetPaperTradingStoreForTest,
  resolveNextTickWindow,
  runPaperTradingSessionTick,
  seedPaperTradingSessionForTest,
} from "@/lib/server/paperTrading/sessionStore";
import type { PaperTradingPriceSnapshotProvider } from "@/lib/server/paperTrading/marketData";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

const testPriceProvider: PaperTradingPriceSnapshotProvider = async (
  stocks,
  tickIndex,
  tickWindowStart,
) =>
  stocks.map((stock, index) => ({
    ticker: stock.ticker,
    name: stock.name,
    price: 100_000 + tickIndex * 1_000 + index * 10_000,
    changePct: tickIndex === 0 ? 0 : 1,
    asOf: tickWindowStart,
    freshnessSeconds: 0,
  }));

describe("paper trading session store", () => {
  it("세션 생성 시 첫 tick과 자산곡선을 만든다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });

    expect(detail.session.portfolioValue).toBe(1_000_000);
    expect(detail.session.mode).toBe("live-paper");
    expect(detail.session.decisionProvider).toBe("mock");
    expect(detail.ticks).toHaveLength(1);
    expect(detail.positions[0]?.allocationPct).toBeLessThanOrEqual(50);
    expect(Number.isInteger(detail.positions[0]?.quantity)).toBe(true);
    expect(detail.equityCurve.map((point) => point.value)).toEqual([1_000_000, 1_000_000]);
  });

  it("tick 추가 시 이전 tick은 보존하고 새 tick을 append 한다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });
    const firstTickId = detail.ticks[0]?.id;

    const next = await runPaperTradingSessionTick(detail.session.id, {
      triggeredBy: "user",
      priceSnapshotProvider: testPriceProvider,
    });

    expect(next?.ticks).toHaveLength(2);
    expect(next?.ticks[0]?.id).toBe(firstTickId);
    expect(next?.equityCurve.length).toBe(3);
  });

  it("같은 tick window 요청은 중복 tick을 만들지 않는다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });
    const window = detail.session.lastTickWindowStart ?? "";

    const duplicated = await runPaperTradingSessionTick(detail.session.id, {
      triggeredBy: "user",
      tickWindowStart: window,
      priceSnapshotProvider: testPriceProvider,
    });

    expect(duplicated?.ticks).toHaveLength(1);
  });

  it("여러 종목을 종목명과 함께 세션에 보존하고 첫 tick에서 분산 배분한다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "테스트",
      tickers: ["005930", "000660"],
      stocks: [
        { ticker: "005930", name: "삼성전자", market: "KOSPI" },
        { ticker: "000660", name: "SK하이닉스", market: "KOSPI" },
      ],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
    }, { priceSnapshotProvider: testPriceProvider });

    expect(detail.session.stocks.map((stock) => stock.name)).toEqual([
      "삼성전자",
      "SK하이닉스",
    ]);
    expect(detail.positions.map((position) => position.name).sort()).toEqual([
      "SK하이닉스",
      "삼성전자",
    ]);
    expect(detail.latestDecision?.targetAllocations).toHaveLength(2);
  });
});

describe("cli-agent 세션 생성 (intraday-paper-watch)", () => {
  it("단타 주기(기본 5분)로 강제되고, KIS 미설정 환경에선 결정론 폴백으로 첫 틱을 만든다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "단타 모의 · 삼성전자",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "cli-agent",
      aiProvider: "codex",
    }, { priceSnapshotProvider: testPriceProvider });

    expect(detail.session.decisionProvider).toBe("cli-agent");
    expect(detail.session.aiProvider).toBe("codex");
    expect(detail.session.tickIntervalMinutes).toBe(5);
    expect(detail.ticks).toHaveLength(1);
    expect(detail.latestDecision?.source).toBe("cli-agent");
    // 테스트 환경 = KIS 미설정 → 분봉 없음 → 사전 게이트가 LLM 을 스킵하고 결정론 폴백(HOLD).
    expect(detail.latestDecision?.action).toBe("HOLD");
    expect(detail.ticks[0]?.rationale).toContain("신호가 없어 관망");
  });

  it("같은 종목 running 단타 세션이 있으면 새로 만들지 않고 그 세션을 반환한다(타임아웃 재클릭 멱등)", async () => {
    resetPaperTradingStoreForTest();
    const request = {
      name: "단타 모의 · 삼성전자",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced" as const,
      decisionProvider: "cli-agent" as const,
    };
    const first = await createPaperTradingSession(request, { priceSnapshotProvider: testPriceProvider });
    const second = await createPaperTradingSession(request, { priceSnapshotProvider: testPriceProvider });
    expect(second.session.id).toBe(first.session.id);
    expect((await listPaperTradingSessions()).length).toBe(1);
  });

  it("KST 날짜가 바뀌면 같은 종목의 이전 running 세션이 있어도 새 단타 세션을 만든다", async () => {
    resetPaperTradingStoreForTest();
    seedPaperTradingSessionForTest({
      id: "yesterday",
      name: "단타 모의 · 삼성전자",
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
      startedAt: "2026-07-08T01:00:00.000Z", // 2026-07-08 10:00 KST.
      endedAt: null,
      createdAt: "2026-07-08T01:00:00.000Z",
      updatedAt: "2026-07-08T01:00:00.000Z",
    });

    const detail = await createPaperTradingSession({
      name: "단타 모의 · 삼성전자",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "cli-agent",
      aiProvider: "codex",
    }, {
      now: new Date("2026-07-09T00:30:00.000Z"), // 2026-07-09 09:30 KST.
      priceSnapshotProvider: testPriceProvider,
    });

    expect(detail.session.id).not.toBe("yesterday");
    expect(detail.session.startedAt).toBe("2026-07-09T00:30:00.000Z");
    expect((await listPaperTradingSessions()).map((session) => session.id).sort()).toEqual([
      "yesterday",
      detail.session.id,
    ].sort());
  });

  it("요청 주기(2분)가 있으면 세션에 그대로 반영된다", async () => {
    resetPaperTradingStoreForTest();
    const detail = await createPaperTradingSession({
      name: "단타 모의 · 삼성전자",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "cli-agent",
      tickIntervalMinutes: 2,
    }, { priceSnapshotProvider: testPriceProvider });

    expect(detail.session.tickIntervalMinutes).toBe(2);
    // mock 세션은 요청 주기를 무시하고 30분 유지.
    const mock = await createPaperTradingSession({
      name: "mock",
      tickers: ["005930"],
      stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
      initialCash: 1_000_000,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "mock",
      tickIntervalMinutes: 2,
    }, { priceSnapshotProvider: testPriceProvider });
    expect(mock.session.tickIntervalMinutes).toBe(30);
  });
});

describe("resolveNextTickWindow (틱 윈도 폴백)", () => {
  const baseSession = (overrides: Partial<PaperTradingSession>): PaperTradingSession => ({
    id: "s1",
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
    tickIntervalMinutes: 30,
    decisionProvider: "mock",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: "2026-07-03T00:00:00.000Z",
    endedAt: null,
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  });

  // KST 10:23 시점.
  const now = new Date("2026-07-03T01:23:45.000Z");

  it("cli-agent 는 마지막 창과 무관하게 벽시계 현재 창으로 고정(드리프트 방지)", () => {
    const session = baseSession({
      decisionProvider: "cli-agent",
      tickIntervalMinutes: 5,
      lastTickWindowStart: "2026-07-03T00:20:00.000Z", // 1시간 전 창에 멈춰 있어도
    });
    expect(resolveNextTickWindow(session, now)).toBe("2026-07-03T01:20:00.000Z");
  });

  it("mock 은 기존 동작 유지 — 마지막 창 +interval", () => {
    const session = baseSession({
      lastTickWindowStart: "2026-07-03T00:30:00.000Z",
    });
    expect(resolveNextTickWindow(session, now)).toBe("2026-07-03T01:00:00.000Z");
  });

  it("mock 첫 틱(마지막 창 없음)은 현재 창으로 내림", () => {
    const session = baseSession({ lastTickWindowStart: null });
    expect(resolveNextTickWindow(session, now)).toBe("2026-07-03T01:00:00.000Z");
  });
});
