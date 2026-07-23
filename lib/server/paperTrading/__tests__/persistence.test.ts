import { afterEach, describe, expect, it, vi } from "vitest";
import {
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
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
