import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLatestAIDecision,
  isAIDecisionStoreConfigured,
  upsertAIDecision,
} from "@/lib/server/ai/decisionStore";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

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
    })).resolves.toEqual({ ok: true, skipped: true, reason: "not_configured" });
  });

  it("ticker 최신 결론을 Supabase REST에서 조회해 camelCase로 반환한다", async () => {
    configureEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        ticker: "005930",
        provider: "codex",
        decision,
        sentiment: null,
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
      provider: "codex",
      decision,
      sentiment: null,
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
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
        body: expect.stringContaining("\"ticker\":\"005930\""),
      }),
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
    })).resolves.toEqual(expect.objectContaining({
      ok: false,
      skipped: false,
    }));

    warnSpy.mockRestore();
  });
});
