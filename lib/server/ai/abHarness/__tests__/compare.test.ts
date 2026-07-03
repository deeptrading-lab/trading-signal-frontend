/**
 * A/B 비교 보조 지표 단위 테스트.
 *
 * Supabase 조회 없이 순수 계산만 검증한다.
 */

import { describe, expect, it } from "vitest";
import {
  buildRunHealth,
  verdictDirectionAgreementRate,
  verdictOrdinalDistance,
} from "@/lib/server/ai/abHarness/compare";
import type { AgentUsageRecord } from "@/lib/server/ai/agentUsageStore";
import type { ScorecardRow } from "@/lib/types/scorecard/scorecard";

function usage(overrides: Partial<AgentUsageRecord>): AgentUsageRecord {
  return {
    runId: "run-a",
    ticker: "005930",
    agentKey: "news",
    stage: "A",
    round: null,
    provider: "codex",
    model: "gpt-5-codex",
    measured: true,
    inputTokens: 100,
    outputTokens: 10,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUsd: null,
    durationMs: 1000,
    createdAt: "2026-07-03T00:00:01.000Z",
    ...overrides,
  };
}

function score(runId: string): ScorecardRow {
  return { runId } as ScorecardRow;
}

describe("buildRunHealth", () => {
  it("run wall-clock 중앙값·최악값과 실행 진단 카운트를 계산한다", () => {
    const rows = [
      usage({
        runId: "run-a",
        measured: true,
        durationMs: 60_000,
        createdAt: "2026-07-03T00:01:00.000Z",
      }),
      usage({
        runId: "run-b",
        measured: false,
        durationMs: 11 * 60_000,
        createdAt: "2026-07-03T00:12:00.000Z",
      }),
      usage({
        runId: "run-c",
        measured: true,
        durationMs: 180_000,
        createdAt: "2026-07-03T00:03:00.000Z",
      }),
    ];

    const health = buildRunHealth(rows, [score("run-a"), score("run-c")]);

    expect(health.completedRunCount).toBe(2);
    expect(health.incompleteRunCount).toBe(1);
    expect(health.unmeasuredAgentCount).toBe(1);
    expect(health.longAgentCount).toBe(1);
    expect(health.medianWallClockMs).toBe(180_000);
    expect(health.worstWallClockMs).toBe(11 * 60_000);
  });
});

describe("verdict comparison", () => {
  it("인접 verdict drift와 방향 일치를 분리해 계산한다", () => {
    const base = new Map([
      ["005930", "REDUCE"],
      ["000660", "BUY"],
      ["035720", "HOLD"],
    ]);
    const variant = new Map([
      ["005930", "UNDERWEIGHT"],
      ["000660", "OVERWEIGHT"],
      ["035720", "SELL"],
    ]);

    expect(verdictOrdinalDistance(base, variant)).toBeCloseTo((1 + 1 + 3) / 3, 6);
    expect(verdictDirectionAgreementRate(base, variant)).toBeCloseTo(2 / 3, 6);
  });
});
