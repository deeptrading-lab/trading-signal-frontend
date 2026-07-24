import { describe, expect, it } from "vitest";
import { buildMemory, buildRuntimeContext } from "../src/memory";
import type { DailyMistakeSource, RuleCandidate } from "../src/types";

const candidate = (over: Partial<RuleCandidate> = {}): RuleCandidate => ({
  key: "entry-confirmation-before-cut",
  scope: "ENTRY",
  condition: "저항+확인전",
  action: "재확인대기",
  avoid: "즉시진입",
  keywords: ["저항", "확인"],
  supports: true,
  independentSamples: 7,
  closedTrades: 7,
  netPnlKrw: -10_000,
  wins: 1,
  losses: 6,
  note: "fixture",
  ...over,
});

const source = (
  date: string,
  candidates: RuleCandidate[] = [candidate()],
): DailyMistakeSource => ({
  schemaVersion: 1,
  namespace: `fixture:${date}`,
  date,
  operator: "test",
  inputHash: date,
  status: "READY",
  skipReasons: [],
  quality: {
    completedSessions: 1,
    totalSessions: 1,
    ticks: 10,
    labelCoverageRate: 1,
    unresolvedLabelRate: 0,
    fallbackRate: 0,
    owners: ["test"],
  },
  actual: {
    closedTrades: 7,
    wins: 1,
    losses: 6,
    winRate: 1 / 7,
    netPnlKrw: -10_000,
    costsKrw: 1_000,
    portfolioReturnPct: -0.1,
    maxSessionDrawdownPct: -0.2,
    forcedExitTrades: 7,
    proactiveExitTrades: 0,
  },
  counterfactualBuy: {
    wins: 2,
    losses: 5,
    neutral: 0,
    unresolved: 0,
    winRate: 2 / 7,
    avgGrossReturnPct: -0.3,
  },
  selection: { snapshots: 1, evaluable: false, note: "보류" },
  candidates,
  generatedAt: `${date}T08:00:00.000Z`,
});

describe("buildMemory", () => {
  it("하루 근거는 SHADOW로만 만든다", () => {
    const result = buildMemory([source("2026-07-21")], "2026-07-22T00:00:00.000Z");
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].status).toBe("SHADOW");
    expect(result.markdown.length).toBeLessThanOrEqual(1_800);
  });

  it("3일·독립/폐쇄 20표본을 넘은 손실패턴만 ACTIVE로 승격한다", () => {
    const result = buildMemory([
      source("2026-07-21"),
      source("2026-07-22"),
      source("2026-07-23"),
    ]);
    expect(result.rules[0].status).toBe("ACTIVE");
    expect(result.rules[0].evidence).toContain("d=3");
  });

  it("동일 key의 의미가 충돌하면 CM에서 제외한다", () => {
    const result = buildMemory([
      source("2026-07-21"),
      source("2026-07-22", [candidate({ action: "즉시진입" })]),
    ]);
    expect(result.conflicts).toEqual(["entry-confirmation-before-cut"]);
    expect(result.rules).toHaveLength(0);
  });

  it("SHADOW가 14일 넘게 새 근거 없이 만료되면 CM에서 제거한다", () => {
    const result = buildMemory([source("2026-07-01")], "2026-07-20T00:00:00.000Z");
    expect(result.rules).toHaveLength(0);
    expect(result.retired[0]).toMatchObject({
      key: "entry-confirmation-before-cut",
      reason: "만료(2026-07-15)",
    });
  });

  it("런타임은 scope와 문자 예산을 적용한다", () => {
    const result = buildMemory([source("2026-07-21")]);
    expect(buildRuntimeContext(result.markdown, ["ENTRY"])).toContain("T:ENTRY");
    expect(buildRuntimeContext(result.markdown, ["EXIT"])).toBe("");
    expect(buildRuntimeContext(result.markdown, [], 6, 60)).toBe("");
  });
});
