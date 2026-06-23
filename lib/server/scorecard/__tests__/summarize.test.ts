/**
 * 적중률 집계 단위 테스트 — PRD `signal-scorecard` AC-7.
 *
 * BUY/d1 시드(hit 3·miss 1·flat 1) → 해당 셀 hit=3,miss=1,flat=1,total=5,hitRate=0.75.
 * hitRate = hit/(hit+miss)(flat 분모 제외). 분모 0(전부 flat)이면 null.
 */

import { describe, it, expect } from "vitest";
import { summarizeScorecard, countScored } from "@/lib/server/scorecard/summarize";
import type { HorizonStatus, ScorecardRow } from "@/lib/types/scorecard/scorecard";

function row(d1: HorizonStatus, overrides: Partial<ScorecardRow> = {}): ScorecardRow {
  return {
    id: Math.random().toString(36).slice(2),
    ticker: "005930",
    provider: "claude",
    verdict: "BUY",
    decisionConfidence: "HIGH",
    signalScore: 70,
    signalAction: "BUY",
    targetPct: 10,
    stopLossPct: -5,
    entryClose: 100,
    entryDate: "2026-06-01",
    livePrice: 100,
    decidedAt: "2026-06-01T07:00:00.000Z",
    runId: "run",
    d1Status: d1,
    d1Close: null,
    d1ReturnPct: null,
    d1ScoredAt: null,
    d1BenchReturnPct: null,
    d1ExcessReturnPct: null,
    d1Beta: null,
    d1AlphaResidualPct: null,
    d1Regime: null,
    w1Status: "pending",
    w1Close: null,
    w1ReturnPct: null,
    w1ScoredAt: null,
    w1BenchReturnPct: null,
    w1ExcessReturnPct: null,
    w1Beta: null,
    w1AlphaResidualPct: null,
    w1Regime: null,
    m1Status: "pending",
    m1Close: null,
    m1ReturnPct: null,
    m1ScoredAt: null,
    m1BenchReturnPct: null,
    m1ExcessReturnPct: null,
    m1Beta: null,
    m1AlphaResidualPct: null,
    m1Regime: null,
    benchKey: null,
    createdAt: "2026-06-01T07:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeScorecard — AC-7", () => {
  it("BUY/d1: hit 3·miss 1·flat 1 → total=5, hitRate=0.75", () => {
    const rows = [
      row("hit"),
      row("hit"),
      row("hit"),
      row("miss"),
      row("flat"),
    ];
    const cells = summarizeScorecard(rows);
    const cell = cells.find(
      (c) => c.dimension === "verdict" && c.key === "BUY" && c.horizon === "d1",
    );
    expect(cell).toBeDefined();
    expect(cell!.hit).toBe(3);
    expect(cell!.miss).toBe(1);
    expect(cell!.flat).toBe(1);
    expect(cell!.total).toBe(5);
    expect(cell!.hitRate).toBeCloseTo(0.75, 6);
  });

  it("confidence·horizon 차원도 동일 표본을 집계", () => {
    const rows = [row("hit"), row("miss")];
    const cells = summarizeScorecard(rows);

    const conf = cells.find(
      (c) => c.dimension === "confidence" && c.key === "HIGH" && c.horizon === "d1",
    );
    expect(conf?.hit).toBe(1);
    expect(conf?.miss).toBe(1);
    expect(conf?.hitRate).toBeCloseTo(0.5, 6);

    const hz = cells.find((c) => c.dimension === "horizon" && c.key === "d1");
    expect(hz?.total).toBe(2);
  });

  it("전부 flat 이면 hitRate=null(분모 0)", () => {
    const rows = [row("flat"), row("flat")];
    const cells = summarizeScorecard(rows);
    const cell = cells.find((c) => c.dimension === "verdict" && c.horizon === "d1");
    expect(cell!.flat).toBe(2);
    expect(cell!.total).toBe(2);
    expect(cell!.hitRate).toBeNull();
  });

  it("pending/skipped 는 집계 제외", () => {
    const rows = [row("pending"), row("skipped"), row("hit")];
    const cells = summarizeScorecard(rows);
    const cell = cells.find((c) => c.dimension === "verdict" && c.horizon === "d1");
    expect(cell!.total).toBe(1);
    expect(cell!.hit).toBe(1);
  });

  it("countScored — 채점 완료(hit/miss/flat) horizon 수", () => {
    const rows = [
      row("hit", { w1Status: "miss", m1Status: "pending" }),
      row("flat", { w1Status: "skipped", m1Status: "pending" }),
    ];
    // d1: hit, flat = 2 / w1: miss, skipped = 1 / m1: pending, pending = 0 → 합 3
    expect(countScored(rows)).toBe(3);
  });

  it("signalScore 구간(보조 차원) 집계", () => {
    const rows = [
      row("hit", { signalScore: 75 }), // 60-100
      row("miss", { signalScore: 30 }), // 0-40
      row("hit", { signalScore: 50 }), // 40-60
    ];
    const cells = summarizeScorecard(rows);
    const high = cells.find(
      (c) => c.dimension === "signalScore" && c.key === "60-100" && c.horizon === "d1",
    );
    expect(high?.hit).toBe(1);
  });

  it("빈 입력 → 빈 셀 배열", () => {
    expect(summarizeScorecard([])).toEqual([]);
    expect(countScored([])).toBe(0);
  });
});
