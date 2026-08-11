import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadPersistedPaperTradingSessionById,
  loadPersistedPaperTradingSessionSummaries,
  loadPersistedPaperTradingTicks,
} from "@/lib/server/paperTrading/persistence";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

function configureSupabase(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
}

describe("paperTrading persistence egress guard", () => {
  it("목록 요약은 sessions 한 번만 조회하고 ticks payload 를 요청하지 않는다", async () => {
    configureSupabase();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          payload: { id: "session-1", status: "running" },
          positions: null,
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadPersistedPaperTradingSessionSummaries();

    expect(result).toEqual({
      status: "ok",
      sessions: [
        {
          session: { id: "session-1", status: "running" },
          positions: [],
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/rest/v1/paper_trading_sessions");
    expect(url).toContain("select=payload,positions");
    expect(url).not.toContain("paper_trading_ticks");
    // 무인자 = 기존 동작(최신 20건, provider 필터 없음). 정렬은 PK tiebreak 포함 전순서.
    expect(url).toContain("order=updated_at.desc,id.desc");
    expect(url).toContain("limit=20");
    expect(url).not.toContain("offset=");
    expect(url).not.toContain("decision_provider=");
  });

  it("과거 내역 페이지는 limit/offset/provider 를 쿼리에 싣고 틱은 건드리지 않는다", async () => {
    configureSupabase();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    await loadPersistedPaperTradingSessionSummaries({
      limit: 21,
      offset: 20,
      decisionProvider: "cli-agent",
      startedBefore: "2026-08-02T15:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("limit=21");
    expect(url).toContain("offset=20");
    expect(url).toContain("decision_provider=eq.cli-agent");
    // JSON 키 경로 필터 — `>` 는 퍼센트 인코딩해서 싣는다(PostgREST 가 디코드 후 파싱).
    expect(url).toContain("payload-%3E%3EstartedAt=lt.2026-08-02T15%3A00%3A00.000Z");
    expect(url).not.toContain("paper_trading_ticks");
  });

  it("세션 단건 로드는 id 로 1행만 읽고, 없으면 session:null 로 성공 반환한다", async () => {
    configureSupabase();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPersistedPaperTradingSessionById("session-9")).resolves.toEqual({
      status: "ok",
      session: null,
    });

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.pathname).toBe("/rest/v1/paper_trading_sessions");
    expect(url.searchParams.get("id")).toBe("eq.session-9");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(url.searchParams.get("select")).toBe("payload,positions");
  });

  it("상세 틱은 마지막 tick_index 이후만 오름차순으로 조회한다", async () => {
    configureSupabase();
    const tick = { id: "tick-8", sessionId: "session-1", tickIndex: 8 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ payload: tick }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPersistedPaperTradingTicks("session-1", 7)).resolves.toEqual({
      status: "ok",
      ticks: [tick],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.pathname).toBe("/rest/v1/paper_trading_ticks");
    expect(url.searchParams.get("session_id")).toBe("eq.session-1");
    expect(url.searchParams.get("tick_index")).toBe("gt.7");
    expect(url.searchParams.get("order")).toBe("tick_index.asc");
  });

  it("Supabase 미설정이면 네트워크 요청 없이 disabled 로 종료한다", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPersistedPaperTradingSessionSummaries()).resolves.toEqual({
      status: "disabled",
    });
    await expect(loadPersistedPaperTradingTicks("session-1")).resolves.toEqual({
      status: "disabled",
    });
    await expect(loadPersistedPaperTradingSessionById("session-1")).resolves.toEqual({
      status: "disabled",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
