/**
 * `getArchivedPaperTradingSessionDetail` — 인메모리 창 밖 과거 세션 상세(intraday-history-pagination).
 *
 * 핵심은 두 가지다.
 *  1) 메모리에 없는 과거 세션도 Supabase 저장본으로 상세를 복원한다(과거 행 펼침 404 해소).
 *  2) ★ 복원한 세션이 **인메모리 스토어에 절대 들어가지 않는다** — 들어가면
 *     `selectSchedulableSessions` 후보가 되어 며칠 전 세션이 다시 틱된다.
 *
 * persistence 는 mock(네트워크 없음).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getArchivedPaperTradingSessionDetail,
  listPaperTradingSessions,
  resetArchivedPaperTradingDetailCacheForTest,
  resetPaperTradingStoreForTest,
} from "@/lib/server/paperTrading/sessionStore";
import { selectSchedulableSessions } from "@/lib/server/paperTrading/tickScheduler";
import {
  loadPersistedPaperTrading,
  loadPersistedPaperTradingSessionById,
  loadPersistedPaperTradingSessionSummaries,
  loadPersistedPaperTradingTicks,
} from "@/lib/server/paperTrading/persistence";
import type {
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

vi.mock("@/lib/server/paperTrading/persistence", () => ({
  loadPersistedPaperTrading: vi.fn(),
  loadPersistedPaperTradingSessionById: vi.fn(),
  loadPersistedPaperTradingSessionSummaries: vi.fn(),
  loadPersistedPaperTradingTicks: vi.fn(),
  persistPaperSession: vi.fn(),
  persistPaperTick: vi.fn(),
}));

const mockById = vi.mocked(loadPersistedPaperTradingSessionById);
const mockTicks = vi.mocked(loadPersistedPaperTradingTicks);
const mockHydrate = vi.mocked(loadPersistedPaperTrading);
const mockSummaries = vi.mocked(loadPersistedPaperTradingSessionSummaries);

const OLD_ID = "0f8e7d6c-1111-4222-8333-444455556666";

function archivedSession(): PaperTradingSession {
  const at = "2026-07-28T00:30:00.000Z";
  return {
    id: OLD_ID,
    name: "단타 모의 · 옛날종목",
    status: "running", // 완료 처리 못 하고 남은 과거 running 세션 — 최악 케이스로 잡는다.
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "옛날종목" }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 1_000_000,
    portfolioValue: 1_020_000,
    returnPct: 2,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: at,
    endedAt: null,
    createdAt: at,
    updatedAt: at,
  } satisfies PaperTradingSession;
}

function tick(tickIndex: number): PaperTradingTick {
  return {
    id: `tick-${tickIndex}`,
    sessionId: OLD_ID,
    tickIndex,
    tickWindowStart: `2026-07-28T0${tickIndex}:00:00.000Z`,
    triggeredBy: "scheduler",
    decision: { action: "HOLD", conviction: 40 },
    orders: [],
    portfolioValueAfter: 1_000_000 + tickIndex * 10_000,
    returnPctAfter: tickIndex,
    rationale: `판단 ${tickIndex}`,
    createdAt: `2026-07-28T0${tickIndex}:00:10.000Z`,
  } as unknown as PaperTradingTick;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetPaperTradingStoreForTest();
  resetArchivedPaperTradingDetailCacheForTest();
  // 인메모리 경로는 비어 있는 상태로 고정(과거 세션은 창 밖이라는 전제).
  mockHydrate.mockResolvedValue({ status: "disabled" });
  mockSummaries.mockResolvedValue({ status: "disabled" });
});

describe("getArchivedPaperTradingSessionDetail", () => {
  it("메모리에 없는 과거 세션을 저장본에서 복원한다(틱 정렬·자산곡선·최근 판단 포함)", async () => {
    mockById.mockResolvedValue({
      status: "ok",
      session: { session: archivedSession(), positions: [] },
    });
    mockTicks.mockResolvedValue({ status: "ok", ticks: [tick(2), tick(1)] });

    const detail = await getArchivedPaperTradingSessionDetail(OLD_ID);

    expect(detail?.ticks.map((t) => t.tickIndex)).toEqual([1, 2]);
    expect(detail?.equityCurve[0]).toMatchObject({ tickIndex: -1, value: 1_000_000 });
    expect(detail?.latestDecision).toEqual({ action: "HOLD", conviction: 40 });
  });

  it("★ 복원해도 인메모리 스토어를 오염시키지 않는다 — 스케줄러 후보가 되지 않는다", async () => {
    mockById.mockResolvedValue({
      status: "ok",
      session: { session: archivedSession(), positions: [] },
    });
    mockTicks.mockResolvedValue({ status: "ok", ticks: [] });

    await getArchivedPaperTradingSessionDetail(OLD_ID);

    const listed = await listPaperTradingSessions();
    expect(listed.map((s) => s.id)).not.toContain(OLD_ID);
    // running·cli-agent 세션인데도 스케줄 후보에 없다 = 다시 틱될 수 없다.
    expect(selectSchedulableSessions(listed)).toEqual([]);
  });

  it("틱 로드가 실패해도 세션 헤더는 살린다(빈 틱)", async () => {
    mockById.mockResolvedValue({
      status: "ok",
      session: { session: archivedSession(), positions: [] },
    });
    mockTicks.mockResolvedValue({ status: "error" });

    const detail = await getArchivedPaperTradingSessionDetail(OLD_ID);

    expect(detail?.session.id).toBe(OLD_ID);
    expect(detail?.ticks).toEqual([]);
  });

  it("저장본에 없거나 로드 실패면 null", async () => {
    mockById.mockResolvedValue({ status: "ok", session: null });
    await expect(getArchivedPaperTradingSessionDetail(OLD_ID)).resolves.toBeNull();

    mockById.mockResolvedValue({ status: "error" });
    await expect(getArchivedPaperTradingSessionDetail(OLD_ID)).resolves.toBeNull();
  });

  it("세션 id 형태가 아니면 조회조차 하지 않는다(무의미한 egress 차단)", async () => {
    await expect(getArchivedPaperTradingSessionDetail("history")).resolves.toBeNull();
    expect(mockById).not.toHaveBeenCalled();
  });

  it("TTL 안에서는 캐시로 답해 틱을 다시 내려받지 않는다", async () => {
    mockById.mockResolvedValue({
      status: "ok",
      session: { session: archivedSession(), positions: [] },
    });
    mockTicks.mockResolvedValue({ status: "ok", ticks: [tick(1)] });

    await getArchivedPaperTradingSessionDetail(OLD_ID, 1_000);
    await getArchivedPaperTradingSessionDetail(OLD_ID, 60_000);
    expect(mockTicks).toHaveBeenCalledTimes(1);

    // TTL(5분) 경과 후에는 다시 읽는다.
    await getArchivedPaperTradingSessionDetail(OLD_ID, 1_000 + 6 * 60_000);
    expect(mockTicks).toHaveBeenCalledTimes(2);
  });
});
