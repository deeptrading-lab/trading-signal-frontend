import { afterEach, describe, expect, it, vi } from "vitest";
import { getAbRunConfigsBySession } from "@/lib/server/ai/abRunConfigStore";
import { getAgentUsageRows } from "@/lib/server/ai/agentUsageStore";
import { getLatestAIDecision } from "@/lib/server/ai/decisionStore";
import { claimNextPending } from "@/lib/server/ai/queueStore";
import { isProfileStoreConfigured } from "@/lib/server/auth/profileStore";
import { summarizeLabels } from "@/lib/server/intraday/tickLabels";
import { getLatestMarketAnalysis } from "@/lib/server/marketAnalysisStore";
import { loadPersistedAutopilotRuns } from "@/lib/server/paperTrading/autopilot/persistence";
import { loadPersistedPaperTrading } from "@/lib/server/paperTrading/persistence";
import { getAllScorecardRows } from "@/lib/server/scorecard/scorecardStore";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Supabase egress guard integration", () => {
  it("차단 모드에서는 모든 서버 저장소가 fetch 전에 fail-soft 처리된다", async () => {
    vi.stubEnv("SUPABASE_EGRESS_DISABLED", "1");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getAbRunConfigsBySession("session")).resolves.toBeNull();
    await expect(getAgentUsageRows()).resolves.toBeNull();
    await expect(getLatestAIDecision("005930")).resolves.toBeNull();
    await expect(claimNextPending("worker")).resolves.toBeNull();
    expect(isProfileStoreConfigured()).toBe(false);
    await expect(getLatestMarketAnalysis()).resolves.toBeNull();
    await expect(loadPersistedAutopilotRuns("operator")).resolves.toEqual({
      status: "disabled",
    });
    await expect(loadPersistedPaperTrading()).resolves.toEqual({ status: "disabled" });
    await expect(getAllScorecardRows()).resolves.toEqual([]);
    await expect(summarizeLabels()).resolves.toMatchObject({
      configured: false,
      total: 0,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
