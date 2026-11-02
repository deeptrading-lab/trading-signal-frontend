import { afterEach, describe, expect, it, vi } from "vitest";
import { isProfileStoreConfigured } from "@/lib/server/auth/profileStore";
import { summarizeLabels } from "@/lib/server/intraday/tickLabels";
import { getLatestMarketAnalysis } from "@/lib/server/marketAnalysisStore";
import { loadPersistedAutopilotRuns } from "@/lib/server/paperTrading/autopilot/persistence";
import { loadPersistedPaperTrading } from "@/lib/server/paperTrading/persistence";
import { isSwingNoteStoreConfigured } from "@/lib/server/swing/noteStore";
import { isSwingStoreConfigured } from "@/lib/server/swing/store";

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

    expect(isProfileStoreConfigured()).toBe(false);
    expect(isSwingStoreConfigured()).toBe(false);
    expect(isSwingNoteStoreConfigured()).toBe(false);
    await expect(getLatestMarketAnalysis()).resolves.toBeNull();
    await expect(loadPersistedAutopilotRuns("operator")).resolves.toEqual({
      status: "disabled",
    });
    await expect(loadPersistedPaperTrading()).resolves.toEqual({ status: "disabled" });
    await expect(summarizeLabels()).resolves.toMatchObject({
      configured: false,
      total: 0,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
