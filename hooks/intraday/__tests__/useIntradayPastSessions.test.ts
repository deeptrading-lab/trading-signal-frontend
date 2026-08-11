/**
 * `mergeHistoryPages` — 과거 내역 무한 페이지 병합(intraday-history-pagination).
 *
 * offset 페이지네이션은 정렬 기준(`updated_at`)이 페이지 사이에 움직이면 경계에서 같은 행이
 * 중복될 수 있다. 병합이 세션 id 로 중복을 걷어내고 시작 시각 내림차순을 보장하는지 고정한다.
 */
import { describe, expect, it } from "vitest";
import { mergeHistoryPages } from "@/hooks/intraday/useIntradayPastSessions";
import type {
  PaperTradingSession,
  PaperTradingSessionHistoryResponse,
} from "@/lib/types/paperTrading/paperTrading";

function session(id: string, startedAt: string): PaperTradingSession {
  return { id, startedAt } as unknown as PaperTradingSession;
}

function page(
  sessions: PaperTradingSession[],
  overrides: Partial<PaperTradingSessionHistoryResponse> = {},
): PaperTradingSessionHistoryResponse {
  return {
    sessions,
    positionsBySessionId: Object.fromEntries(sessions.map((s) => [s.id, []])),
    hasMore: false,
    nextOffset: sessions.length,
    configured: true,
    generatedAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  };
}

describe("mergeHistoryPages", () => {
  it("페이지 경계에서 중복된 세션을 한 번만 남긴다", () => {
    const merged = mergeHistoryPages([
      page([session("a", "2026-08-01T00:00:00.000Z"), session("b", "2026-07-31T00:00:00.000Z")]),
      page([session("b", "2026-07-31T00:00:00.000Z"), session("c", "2026-07-30T00:00:00.000Z")]),
    ]);

    expect(merged.sessions.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("시작 시각 내림차순으로 정렬한다(페이지 도착 순서 무관)", () => {
    const merged = mergeHistoryPages([
      page([session("old", "2026-07-20T00:00:00.000Z")]),
      page([session("new", "2026-08-02T00:00:00.000Z")]),
    ]);

    expect(merged.sessions.map((s) => s.id)).toEqual(["new", "old"]);
  });

  it("빈 페이지·빈 배열도 안전하게 처리한다", () => {
    expect(mergeHistoryPages([]).sessions).toEqual([]);
    expect(mergeHistoryPages([page([])]).sessions).toEqual([]);
  });

  it("포지션 스냅샷을 세션 id 로 모은다", () => {
    const merged = mergeHistoryPages([
      page([session("a", "2026-08-01T00:00:00.000Z")]),
      page([session("b", "2026-07-31T00:00:00.000Z")]),
    ]);

    expect(Object.keys(merged.positionsBySessionId).sort()).toEqual(["a", "b"]);
  });
});
