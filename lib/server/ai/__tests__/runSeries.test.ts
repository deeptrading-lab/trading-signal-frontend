/** runSeries — run 단위 시계열 압축(그룹핑·정렬·합계·wall-clock) 회귀 차단. */

import { describe, it, expect } from "vitest";
import type { AgentUsageRecord } from "@/lib/server/ai/agentUsageStore";
import { runSeries } from "@/lib/server/ai/usageAggregate";

function rec(p: Partial<AgentUsageRecord> & { runId: string; createdAt: string }): AgentUsageRecord {
  return {
    runId: p.runId,
    ticker: p.ticker ?? "005930",
    agentKey: p.agentKey ?? "market",
    stage: p.stage ?? "A",
    round: p.round ?? null,
    provider: p.provider ?? "claude",
    model: p.model ?? "claude-sonnet-4-6",
    measured: p.measured ?? true,
    inputTokens: p.inputTokens ?? null,
    outputTokens: p.outputTokens ?? null,
    cacheCreationInputTokens: p.cacheCreationInputTokens ?? null,
    cacheReadInputTokens: p.cacheReadInputTokens ?? null,
    costUsd: p.costUsd ?? null,
    durationMs: p.durationMs ?? null,
    createdAt: p.createdAt,
  };
}

describe("runSeries", () => {
  it("run_id 별로 묶어 종료시각 오름차순 정렬", () => {
    const rows = [
      rec({ runId: "late", createdAt: "2026-06-28T00:05:00Z" }),
      rec({ runId: "early", createdAt: "2026-06-28T00:01:00Z" }),
    ];
    const series = runSeries(rows);
    expect(series.map((s) => s.runId)).toEqual(["early", "late"]);
  });

  it("비용·토큰 합계 + endedAt=max(created_at)", () => {
    const rows = [
      rec({ runId: "r1", createdAt: "2026-06-28T00:01:00Z", inputTokens: 100, cacheReadInputTokens: 50, outputTokens: 20, costUsd: 1.0 }),
      rec({ runId: "r1", createdAt: "2026-06-28T00:03:00Z", inputTokens: 200, cacheReadInputTokens: 0, outputTokens: 30, costUsd: 2.0 }),
    ];
    const [s] = runSeries(rows);
    expect(s.endedAt).toBe("2026-06-28T00:03:00.000Z");
    expect(s.totalCost).toBeCloseTo(3.0);
    expect(s.totalInput).toBe(350); // (100+50)+(200+0)
    expect(s.totalOutput).toBe(50);
    expect(s.agentCount).toBe(2);
  });

  it("wall-clock = max(종료) - min(시작), 시작=created-duration", () => {
    // r1: 00:01 종료 duration 60s → 시작 00:00 ; r2: 00:03 종료 duration 30s → 시작 02:30
    const rows = [
      rec({ runId: "x", createdAt: "2026-06-28T00:01:00Z", durationMs: 60_000 }),
      rec({ runId: "x", createdAt: "2026-06-28T00:03:00Z", durationMs: 30_000 }),
    ];
    const [s] = runSeries(rows);
    // span = 00:03:00 - 00:00:00 = 180s
    expect(s.wallClockMs).toBe(180_000);
  });

  it("측정 비용 없으면(codex) totalCost null, 토큰은 measured 행만", () => {
    const rows = [
      rec({ runId: "c", createdAt: "2026-06-28T00:01:00Z", measured: false, costUsd: null, inputTokens: 999 }),
    ];
    const [s] = runSeries(rows);
    expect(s.totalCost).toBeNull();
    expect(s.totalInput).toBe(0); // measured=false 라 합산 제외
  });
});
