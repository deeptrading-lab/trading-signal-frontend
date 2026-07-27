import { describe, expect, it } from "vitest";
import { buildMemory } from "../../../../packages/intraday-mistake-note/src/memory";
import type { DailyMistakeSource } from "../../../../packages/intraday-mistake-note/src/types";
import { buildMistakeNoteDashboard } from "../mistakeNoteDashboard";
import type { MistakeNotePolicy } from "@/lib/types/intraday/mistakeNoteDashboard";

const policy: MistakeNotePolicy = {
  runAfterKst: "16:30",
  goalZonePct: [1, 2],
  memory: { maxRules: 12, maxChars: 1_800, runtimeMaxRules: 6, runtimeMaxChars: 900 },
};

function source(date: string, status: DailyMistakeSource["status"] = "READY"): DailyMistakeSource {
  return {
    schemaVersion: 1,
    namespace: "test:operator",
    date,
    operator: "테스트",
    inputHash: date,
    status,
    skipReasons: [],
    quality: {
      completedSessions: 1,
      totalSessions: 1,
      ticks: 10,
      labelCoverageRate: 1,
      unresolvedLabelRate: 0,
      fallbackRate: 0,
      owners: ["테스트"],
    },
    actual: {
      closedTrades: 1,
      wins: 0,
      losses: 1,
      winRate: 0,
      netPnlKrw: -1_000,
      costsKrw: 100,
      portfolioReturnPct: -0.1,
      maxSessionDrawdownPct: -0.2,
      forcedExitTrades: 1,
      proactiveExitTrades: 0,
    },
    counterfactualBuy: {
      wins: 0,
      losses: 1,
      neutral: 0,
      unresolved: 0,
      winRate: 0,
      avgGrossReturnPct: -0.2,
    },
    selection: { snapshots: 1, evaluable: false, note: "미선정 outcome 없음" },
    candidates: [{
      key: "wait-for-confirmation",
      scope: "ENTRY",
      condition: "돌파 전",
      action: "확인 대기",
      avoid: "선진입",
      keywords: ["돌파", "대기"],
      supports: true,
      independentSamples: 1,
      closedTrades: 1,
      netPnlKrw: -1_000,
      wins: 0,
      losses: 1,
      note: "test",
    }],
    generatedAt: `${date}T08:00:00.000Z`,
  };
}

describe("buildMistakeNoteDashboard", () => {
  it("가장 최근 READY source와 CM 동기화 상태를 보여준다", () => {
    const sources = [source("2026-07-21"), source("2026-07-22")];
    const loadedAt = "2026-07-23T07:30:00.000Z";
    const memory = buildMemory(sources, loadedAt).markdown;
    const result = buildMistakeNoteDashboard(sources, memory, policy, loadedAt);

    expect(result.latest?.date).toBe("2026-07-22");
    expect(result.days.map((day) => day.date)).toEqual(["2026-07-22", "2026-07-21"]);
    expect(result.memory.sourceSynced).toBe(true);
    expect(result.memory.shadowCount).toBe(1);
    expect(result.validation.ok).toBe(true);
  });

  it("CM 규칙이 source와 다르면 재생성 필요로 표시한다", () => {
    const loadedAt = "2026-07-23T07:30:00.000Z";
    const result = buildMistakeNoteDashboard([source("2026-07-22")], "# stale\n", policy, loadedAt);

    expect(result.memory.sourceSynced).toBe(false);
    expect(result.validation.ok).toBe(false);
  });
});
