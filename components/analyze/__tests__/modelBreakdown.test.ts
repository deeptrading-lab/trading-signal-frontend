/** 모델별 비용 분해(groupByModel/modelFamily) 회귀 차단 — 순수 파생 로직. */

import { describe, it, expect } from "vitest";
import type { AgentKey } from "@/lib/types/stock/aiAnalysis";
import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";
import { groupByModel, modelFamily, UNMEASURED_FAMILY } from "../modelBreakdown";

/** 테스트용 AgentUsageRow 생성기 — 관심 필드만 받고 나머지는 기본값. */
function row(p: {
  agentKey: AgentKey;
  model: string | null;
  input?: number | null;
  cacheRead?: number | null;
  output?: number | null;
  cacheCreation?: number | null;
  cost?: number | null;
}): AgentUsageRow {
  return {
    agentKey: p.agentKey,
    stage: "A",
    orderIndex: 0,
    sampleCount: 1,
    measuredCount: p.cost == null ? 0 : 1,
    model: p.model,
    avgInputTokens: p.input ?? null,
    avgOutputTokens: p.output ?? null,
    avgCacheReadTokens: p.cacheRead ?? null,
    avgCacheCreationTokens: p.cacheCreation ?? null,
    cacheHitRate: null,
    avgCostUsd: p.cost ?? null,
    avgDurationMs: null,
  };
}

describe("modelFamily", () => {
  it("claude 모델 id 를 패밀리로 정규화", () => {
    expect(modelFamily("claude-opus-4-8")).toBe("opus");
    expect(modelFamily("claude-sonnet-4-6")).toBe("sonnet");
    expect(modelFamily("claude-haiku-4-5")).toBe("haiku");
  });

  it("매칭 없으면 원본 id, null 이면 미측정 버킷", () => {
    expect(modelFamily("gpt-5-codex")).toBe("gpt-5-codex");
    expect(modelFamily(null)).toBe(UNMEASURED_FAMILY);
  });
});

describe("groupByModel", () => {
  const rows = [
    row({ agentKey: "market", model: "claude-sonnet-4-6", input: 1000, cacheRead: 500, output: 200, cost: 0.3 }),
    row({ agentKey: "news", model: "claude-sonnet-4-6", input: 2000, cacheRead: 0, output: 300, cost: 0.5 }),
    row({ agentKey: "trader", model: "claude-opus-4-8", input: 1500, cacheRead: 1500, output: 800, cost: 1.2 }),
    row({ agentKey: "portfolio_manager", model: "claude-opus-4-8", input: 2000, cacheRead: 2000, output: 1000, cost: 2.0 }),
  ];

  it("모델 패밀리별로 비용·토큰을 합산", () => {
    const groups = groupByModel(rows);
    const opus = groups.find((g) => g.family === "opus")!;
    const sonnet = groups.find((g) => g.family === "sonnet")!;

    expect(opus.agentCount).toBe(2);
    expect(opus.agentKeys).toEqual(["trader", "portfolio_manager"]);
    expect(opus.totalCost).toBeCloseTo(3.2);
    // 입력 = 신규 + 캐시읽기 합 = (1500+1500)+(2000+2000)
    expect(opus.totalInput).toBe(7000);
    expect(opus.totalOutput).toBe(1800);

    expect(sonnet.totalCost).toBeCloseTo(0.8);
    expect(sonnet.totalInput).toBe(3500);
  });

  it("costShare 합이 1 (전체 비용 > 0)", () => {
    const groups = groupByModel(rows);
    const sumShare = groups.reduce((a, g) => a + (g.costShare ?? 0), 0);
    expect(sumShare).toBeCloseTo(1);
    // 비용 desc 정렬 → 첫 행이 가장 비싼 opus
    expect(groups[0].family).toBe("opus");
    expect(groups[0].costShare).toBeCloseTo(3.2 / 4.0);
  });

  it("비용 미측정(codex) 행은 totalCost·costShare null, 토큰은 집계", () => {
    const codexRows = [
      row({ agentKey: "market", model: "gpt-5-codex", input: 1000, cacheRead: 0, output: 200, cost: null }),
      row({ agentKey: "trader", model: null, input: 500, output: 100, cost: null }),
    ];
    const groups = groupByModel(codexRows);
    for (const g of groups) {
      expect(g.totalCost).toBeNull();
      expect(g.costShare).toBeNull();
    }
    const codex = groups.find((g) => g.family === "gpt-5-codex")!;
    expect(codex.totalInput).toBe(1000);
    const unmeasured = groups.find((g) => g.family === UNMEASURED_FAMILY)!;
    expect(unmeasured.totalInput).toBe(500);
  });

  it("일부만 측정된 패밀리는 측정 행만 비용 합산", () => {
    const mixed = [
      row({ agentKey: "trader", model: "claude-opus-4-8", input: 100, output: 50, cost: 1.0 }),
      row({ agentKey: "portfolio_manager", model: "claude-opus-4-8", input: 100, output: 50, cost: null }),
    ];
    const opus = groupByModel(mixed).find((g) => g.family === "opus")!;
    expect(opus.totalCost).toBeCloseTo(1.0);
    expect(opus.agentCount).toBe(2);
  });
});
