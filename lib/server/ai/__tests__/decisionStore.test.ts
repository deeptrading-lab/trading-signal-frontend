import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAIDecisionCardSummaries,
  getLatestAIDecision,
  isAIDecisionStoreConfigured,
  upsertAIDecision,
} from "@/lib/server/ai/decisionStore";
import type { DecisionSignal, FinalDecision } from "@/lib/types/stock/aiAnalysis";

const ORIGINAL_ENV = { ...process.env };

const decision: FinalDecision = {
  verdict: "BUY",
  reasoning: "근거",
  key_strengths: ["강점"],
  key_risks: ["리스크"],
  confidence: "HIGH",
  time_horizon: "중기",
  new_entry_strategy: "신규 진입",
  holder_strategy: "보유",
  target_pct: 12,
  stop_loss_pct: -5,
  risk_reward_ratio: 2.4,
  short_term_outlook: "단기",
  mid_term_outlook: "중기",
  limitedData: false,
  bars: 250,
};

const signal: DecisionSignal = {
  score: 72,
  action: "BUY",
  confidence: 0.75,
  regime: 1,
  axes: [
    { axis: "trend", score: 78, direction: 1 },
    { axis: "momentum", score: 70, direction: 1 },
    { axis: "volume", score: 65, direction: 0 },
    { axis: "volatility", score: 60, direction: 1 },
  ],
  asOf: "2026-06-16",
};

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

function configureEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
}

describe("AI decision Supabase store", () => {
  it("Supabase 미설정이면 조회 null, 저장 skipped", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(isAIDecisionStoreConfigured()).toBe(false);
    await expect(getLatestAIDecision("005930")).resolves.toBeNull();
    await expect(upsertAIDecision({
      ticker: "005930",
      provider: "codex",
      decision,
      sentiment: null,
      signal: null,
    })).resolves.toEqual({ ok: true, skipped: true, reason: "not_configured" });
  });

  it("ticker 최신 결론을 Supabase REST에서 조회해 camelCase로 반환한다", async () => {
    configureEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        ticker: "005930",
        name: "삼성전자",
        provider: "codex",
        decision,
        sentiment: null,
        signal,
        updated_at: "2026-06-16T00:00:00.000Z",
      }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getLatestAIDecision("005930");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/rest/v1/ai_analysis_decisions"),
      }),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual({
      ticker: "005930",
      name: "삼성전자",
      provider: "codex",
      decision,
      sentiment: null,
      signal,
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
  });

  it("카드 목록은 RPC의 최신 20건 요약과 DB 집계 토큰만 반환한다", async () => {
    configureEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        ticker: "005930",
        name: "삼성전자",
        provider: "claude",
        updated_at: "2026-07-24T00:00:00.000Z",
        verdict: "BUY",
        time_horizon: "중기",
        limited_data: false,
        bars: 200,
        signal_score: "72",
        run_id: "8f031d78-5692-46f6-ab69-a2955b3b3f6e",
        total_input_tokens: "120000",
        total_output_tokens: "8000",
        total_cost_usd: "2.45",
        measured: true,
      }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAIDecisionCardSummaries(200)).resolves.toEqual([{
      ticker: "005930",
      name: "삼성전자",
      provider: "claude",
      decision: {
        verdict: "BUY",
        time_horizon: "중기",
        limitedData: false,
        bars: 200,
      },
      signal: { score: 72 },
      updatedAt: "2026-07-24T00:00:00.000Z",
      tokens: {
        runId: "8f031d78-5692-46f6-ab69-a2955b3b3f6e",
        totalInputTokens: 120000,
        totalOutputTokens: 8000,
        totalCostUsd: 2.45,
        measured: true,
      },
    }]);
    const calledUrl = fetchMock.mock.calls[0][0] as URL;
    expect(calledUrl.pathname).toBe("/rest/v1/rpc/get_ai_decision_card_summaries");
    expect(calledUrl.searchParams.get("p_limit")).toBe("20");
  });

  it("카드 RPC 실패 시 전체 payload/usage 조회 없이 JSON projection 20건으로 폴백한다", async () => {
    configureEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          ticker: "000660",
          name: "SK하이닉스",
          provider: "codex",
          updated_at: "2026-07-24T00:00:00.000Z",
          verdict: "HOLD",
          time_horizon: "단기",
          limited_data: true,
          bars: 90,
          signal_score: 55,
        }],
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAIDecisionCardSummaries();

    expect(result[0]).toMatchObject({
      ticker: "000660",
      decision: { verdict: "HOLD", limitedData: true, bars: 90 },
      tokens: null,
    });
    const fallbackUrl = fetchMock.mock.calls[1][0] as URL;
    expect(fallbackUrl.pathname).toBe("/rest/v1/ai_analysis_decisions");
    expect(fallbackUrl.searchParams.get("limit")).toBe("20");
    expect(fallbackUrl.searchParams.get("select")).toContain("verdict:decision->>verdict");
    expect(fallbackUrl.searchParams.get("select")).not.toContain("sentiment");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it("PM 결론을 ticker primary key 기준으로 upsert 한다", async () => {
    configureEnv();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertAIDecision({
      ticker: "005930",
      provider: "claude",
      decision,
      sentiment: { band: "POSITIVE", score: 7, confidence: "medium", summary: "긍정" },
      signal,
    });

    expect(result).toEqual({ ok: true, skipped: false });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/ai_analysis_decisions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Prefer: "resolution=merge-duplicates,return=minimal",
          Authorization: "Bearer service-role",
        }),
        body: expect.stringContaining("\"signal\":{\"score\":72"),
      }),
    );
  });

  it("종목명(name)이 있으면 함께 upsert 하고, 없으면 키를 생략한다(decision-stock-name)", async () => {
    configureEnv();

    // 있으면 body 에 name 포함.
    const withName = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", withName);
    await upsertAIDecision({
      ticker: "005930",
      name: "삼성전자",
      provider: "claude",
      decision,
      sentiment: null,
      signal: null,
    });
    expect((withName.mock.calls[0][1] as { body: string }).body).toContain(
      '"name":"삼성전자"',
    );

    // 없으면 키 생략 → merge-duplicates 가 기존(백필) 종목명을 보존.
    const noName = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", noName);
    await upsertAIDecision({
      ticker: "005930",
      provider: "claude",
      decision,
      sentiment: null,
      signal: null,
    });
    expect((noName.mock.calls[0][1] as { body: string }).body).not.toContain(
      '"name"',
    );
  });

  it("Supabase fetch 예외는 fail-soft 처리한다", async () => {
    configureEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLatestAIDecision("005930")).resolves.toBeNull();
    await expect(upsertAIDecision({
      ticker: "005930",
      provider: "codex",
      decision,
      sentiment: null,
      signal: null,
    })).resolves.toEqual(expect.objectContaining({
      ok: false,
      skipped: false,
    }));

    warnSpy.mockRestore();
  });
});
