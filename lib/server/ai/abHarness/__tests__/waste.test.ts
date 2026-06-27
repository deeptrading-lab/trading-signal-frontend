/**
 * 낭비 진단(buildWasteReport) 단위 테스트 — yield/cacheCreationShare 계산 + 정렬.
 */

import { describe, it, expect } from "vitest";
import { buildWasteReport } from "@/lib/server/ai/abHarness/waste";
import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";

function row(overrides: Partial<AgentUsageRow>): AgentUsageRow {
  return {
    agentKey: "market",
    stage: "A",
    orderIndex: 0,
    sampleCount: 1,
    measuredCount: 1,
    model: "claude-sonnet-4-6",
    avgInputTokens: 1000,
    avgOutputTokens: 1000,
    avgCacheReadTokens: 0,
    avgCacheCreationTokens: 0,
    cacheHitRate: 0,
    avgCostUsd: 0.1,
    avgDurationMs: 1000,
    ...overrides,
  };
}

describe("buildWasteReport", () => {
  it("yield = 출력 / (신규입력 + 캐시읽기)", () => {
    const r = row({ avgInputTokens: 100, avgCacheReadTokens: 900, avgOutputTokens: 500 });
    const out = buildWasteReport([r]);
    expect(out.agents[0].yieldRatio).toBeCloseTo(500 / 1000, 6);
  });

  it("cacheCreationShare = 캐시생성 / (신규+캐시읽기+캐시생성)", () => {
    const r = row({ avgInputTokens: 100, avgCacheReadTokens: 100, avgCacheCreationTokens: 800 });
    const out = buildWasteReport([r]);
    expect(out.agents[0].cacheCreationShare).toBeCloseTo(800 / 1000, 6);
  });

  it("입력 0 이면 yield null (0 나눗셈 가드)", () => {
    const r = row({ avgInputTokens: 0, avgCacheReadTokens: 0, avgOutputTokens: 100 });
    expect(buildWasteReport([r]).agents[0].yieldRatio).toBeNull();
  });

  it("agents 는 yield 오름차순(최악=많이 읽고 적게 씀 먼저)", () => {
    const lowYield = row({ agentKey: "news", avgInputTokens: 10000, avgOutputTokens: 100 });
    const highYield = row({ agentKey: "trader", avgInputTokens: 100, avgOutputTokens: 1000 });
    const out = buildWasteReport([highYield, lowYield]);
    expect(out.agents[0].agentKey).toBe("news"); // 낮은 yield 먼저
    expect(out.agents[1].agentKey).toBe("trader");
  });

  it("byStage 는 단계별 토큰·비용 합산", () => {
    const a1 = row({ stage: "A", avgInputTokens: 1000, avgCacheReadTokens: 0, avgOutputTokens: 500, avgCostUsd: 0.5 });
    const a2 = row({ stage: "A", avgInputTokens: 2000, avgCacheReadTokens: 0, avgOutputTokens: 700, avgCostUsd: 0.3 });
    const c1 = row({ stage: "C", avgInputTokens: 500, avgCacheReadTokens: 0, avgOutputTokens: 100, avgCostUsd: 0.2 });
    const out = buildWasteReport([a1, a2, c1]);
    const stageA = out.byStage.find((s) => s.stage === "A");
    expect(stageA?.totalInput).toBe(3000);
    expect(stageA?.totalOutput).toBe(1200);
    expect(stageA?.totalCostUsd).toBeCloseTo(0.8, 6);
  });
});
