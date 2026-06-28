/** run 시계열 추세·회귀 감지(analyzeTrend/metricValue/defaultMetric) 회귀 차단. */

import { describe, it, expect } from "vitest";
import type { RunSeriesPoint } from "@/lib/types/stock/agentUsage";
import {
  analyzeTrend,
  defaultMetric,
  metricValue,
  ANOMALY_THRESHOLD,
} from "../runTrend";

function pt(p: {
  runId: string;
  endedAt: string;
  cost?: number | null;
  ms?: number | null;
  input?: number;
  output?: number;
}): RunSeriesPoint {
  return {
    runId: p.runId,
    ticker: "005930",
    endedAt: p.endedAt,
    wallClockMs: p.ms ?? null,
    totalCost: p.cost ?? null,
    totalInput: p.input ?? 0,
    totalOutput: p.output ?? 0,
    totalCacheCreation: 0,
    agentCount: 12,
  };
}

describe("metricValue", () => {
  it("지표별 값 추출 (tokens = 입력+출력)", () => {
    const p = pt({ runId: "a", endedAt: "2026-06-28T00:00:00Z", cost: 3, ms: 1000, input: 100, output: 50 });
    expect(metricValue(p, "cost")).toBe(3);
    expect(metricValue(p, "duration")).toBe(1000);
    expect(metricValue(p, "tokens")).toBe(150);
  });
});

describe("analyzeTrend", () => {
  // 비용 중앙값 = 3 (정렬 [3,3,3,3,10]) → 임계 3*1.3=3.9 → 10 만 이상치
  const series = [
    pt({ runId: "r1", endedAt: "2026-06-28T00:01:00Z", cost: 3 }),
    pt({ runId: "r2", endedAt: "2026-06-28T00:02:00Z", cost: 3 }),
    pt({ runId: "r3", endedAt: "2026-06-28T00:03:00Z", cost: 3 }),
    pt({ runId: "r4", endedAt: "2026-06-28T00:04:00Z", cost: 10 }),
    pt({ runId: "r5", endedAt: "2026-06-28T00:05:00Z", cost: 3 }),
  ];

  it("중앙값 baseline + 임계 초과 이상치 카운트", () => {
    const t = analyzeTrend(series, "cost");
    expect(t.median).toBe(3);
    expect(t.threshold).toBe(ANOMALY_THRESHOLD);
    expect(t.anomalyCount).toBe(1);
    expect(t.points.find((p) => p.runId === "r4")!.isAnomaly).toBe(true);
    expect(t.points.find((p) => p.runId === "r1")!.isAnomaly).toBe(false);
  });

  it("최신(마지막) 측정 포인트 + 중앙값 대비 delta", () => {
    const t = analyzeTrend(series, "cost");
    expect(t.latest).toBe(3); // r5
    expect(t.latestDeltaRatio).toBeCloseTo(0); // 3/3 - 1
    expect(t.measuredCount).toBe(5);
  });

  it("최신이 이상치면 delta 양수", () => {
    const s2 = [...series.slice(0, 4), pt({ runId: "r6", endedAt: "2026-06-28T00:06:00Z", cost: 6 })];
    const t = analyzeTrend(s2, "cost");
    // 측정값 [3,3,3,10,6] 정렬 [3,3,3,6,10] 중앙값=3 → latest 6 → 6/3-1=1.0
    expect(t.latest).toBe(6);
    expect(t.latestDeltaRatio).toBeCloseTo(1.0);
  });

  it("비용 전부 null(codex) → median/latest/delta null, 이상치 0", () => {
    const codex = [
      pt({ runId: "c1", endedAt: "2026-06-28T00:01:00Z", cost: null, ms: 500000 }),
      pt({ runId: "c2", endedAt: "2026-06-28T00:02:00Z", cost: null, ms: 600000 }),
    ];
    const t = analyzeTrend(codex, "cost");
    expect(t.median).toBeNull();
    expect(t.latest).toBeNull();
    expect(t.latestDeltaRatio).toBeNull();
    expect(t.anomalyCount).toBe(0);
    expect(t.measuredCount).toBe(0);
  });

  it("일부 null 포인트는 이상치 판정·중앙값에서 제외", () => {
    const mixed = [
      pt({ runId: "m1", endedAt: "2026-06-28T00:01:00Z", cost: 3 }),
      pt({ runId: "m2", endedAt: "2026-06-28T00:02:00Z", cost: null }),
      pt({ runId: "m3", endedAt: "2026-06-28T00:03:00Z", cost: 3 }),
    ];
    const t = analyzeTrend(mixed, "cost");
    expect(t.measuredCount).toBe(2);
    expect(t.points.find((p) => p.runId === "m2")!.isAnomaly).toBe(false);
  });
});

describe("defaultMetric", () => {
  it("비용 측정 있으면 cost", () => {
    expect(defaultMetric([pt({ runId: "a", endedAt: "2026-06-28T00:00:00Z", cost: 3 })])).toBe("cost");
  });
  it("비용 없고 소요만 있으면 duration (codex)", () => {
    expect(
      defaultMetric([pt({ runId: "a", endedAt: "2026-06-28T00:00:00Z", cost: null, ms: 1000 })]),
    ).toBe("duration");
  });
});
