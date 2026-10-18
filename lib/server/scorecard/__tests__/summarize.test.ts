/**
 * 적중률 집계 단위 테스트 — PRD `signal-scorecard` AC-7.
 *
 * BUY/d1 시드(hit 3·miss 1·flat 1) → 해당 셀 hit=3,miss=1,flat=1,total=5,hitRate=0.75.
 * hitRate = hit/(hit+miss)(flat 분모 제외). 분모 0(전부 flat)이면 null.
 */

import { describe, it, expect } from "vitest";
import {
  summarizeScorecard,
  countScored,
  summarizeDirectionGate,
} from "@/lib/server/scorecard/summarize";
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
    w2Status: "pending",
    w2Close: null,
    w2ReturnPct: null,
    w2ScoredAt: null,
    w2BenchReturnPct: null,
    w2ExcessReturnPct: null,
    w2Beta: null,
    w2AlphaResidualPct: null,
    w2Regime: null,
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

describe("summarizeDirectionGate — 오픈베타 전환 기준", () => {
  const w2 = (verdict: ScorecardRow["verdict"], ret: number | null, status: HorizonStatus = "hit") =>
    row("pending", { verdict, w2Status: status, w2ReturnPct: ret });

  it("찍기 점수는 전체 표본(HOLD 포함) 중 그 방향으로 움직인 비율", () => {
    // 10건: 6 상승 · 4 하락. 강세 5건 중 4 상승, 약세 4건 중 3 하락, HOLD 1(상승).
    const rows = [
      ...[1, 2, 3, 4].map((r) => w2("OVERWEIGHT", r)),
      w2("BUY", -1, "miss"),
      w2("UNDERWEIGHT", -2),
      w2("REDUCE", -3),
      w2("UNDERWEIGHT", 2, "miss"),
      w2("SELL", -4, "flat"),
      w2("HOLD", 1),
    ];
    // 위: 상승 = 4(OW)+1(UW 2)+1(HOLD)=6, 하락 = BUY -1, UW -2, REDUCE -3, SELL -4 = 4
    const g = summarizeDirectionGate(rows);
    expect(g.sample).toBe(10);
    expect(g.bull).toMatchObject({ n: 5, hits: 4, hitRate: 0.8, baseRate: 0.6 });
    expect(g.bull.diffPp).toBeCloseTo(20);
    expect(g.bear).toMatchObject({ n: 4, hits: 3, hitRate: 0.75, baseRate: 0.4 });
    // 표본 부족이라 우위가 커도 통과 아님.
    expect(g.bull.enoughSample).toBe(false);
    expect(g.pass).toBe(false);
  });

  it("방향별 50건 이상 + 찍기 대비 +10%p 이상이면 통과, 경계 포함", () => {
    // 강세 50건: 35 상승(70%). 약세 50건: 30 하락(60%). 전체 상승 35+20=55 → 55%, 하락 15+30=45 → 45%.
    const bull = Array.from({ length: 50 }, (_, i) => w2("OVERWEIGHT", i < 35 ? 1 : -1));
    const bear = Array.from({ length: 50 }, (_, i) => w2("UNDERWEIGHT", i < 30 ? -1 : 1));
    const g = summarizeDirectionGate([...bull, ...bear]);
    expect(g.bull.diffPp).toBeCloseTo(15);
    expect(g.bear.diffPp).toBeCloseTo(15);
    expect(g.pass).toBe(true);

    // 강세 적중 30건(60%)이면 전체 상승 30+20=50% → 정확히 +10%p 경계 — 통과(부동소수 오차 흡수).
    const edge = Array.from({ length: 50 }, (_, i) => w2("OVERWEIGHT", i < 30 ? 1 : -1));
    const g2 = summarizeDirectionGate([...edge, ...bear]);
    expect(g2.bull.diffPp).toBeCloseTo(10);
    expect(g2.bull.pass).toBe(true);
  });

  it("미채점(pending/skipped)·수익률 null·수익률 0 처리", () => {
    const rows = [
      w2("OVERWEIGHT", 3, "pending"),
      w2("OVERWEIGHT", null, "skipped"),
      w2("OVERWEIGHT", null),
      w2("OVERWEIGHT", 0, "flat"),
    ];
    const g = summarizeDirectionGate(rows);
    // 수익률 0 한 건만 표본 — 상승도 하락도 아님 → 적중 0, 찍기 0%.
    expect(g.sample).toBe(1);
    expect(g.bull).toMatchObject({ n: 1, hits: 0, hitRate: 0, baseRate: 0 });
    expect(summarizeDirectionGate([]).bull).toMatchObject({ n: 0, hitRate: null, baseRate: null, diffPp: null });
  });
});
