import { describe, it, expect } from "vitest";
import {
  featureDateStats,
  judgeConfirm,
  judgeFeatureDiscovery,
  judgeFeatureHoldout,
  summarizeFeature,
  type FeatureSummary,
} from "../auditV2";

describe("featureDateStats", () => {
  it("피처와 수익이 단조 증가면 IC 1, 스프레드 = 상위 − 하위 십분위 평균", () => {
    const obs = Array.from({ length: 40 }, (_, i) => ({ date: "2024-01-02", ticker: String(i).padStart(6, "0"), x: i, y: i / 100 }));
    const [d] = featureDateStats(obs);
    expect(d.ic).toBeCloseTo(1, 12);
    // 십분위 4개: 하위 0..3 평균 0.015, 상위 36..39 평균 0.375
    expect(d.spread).toBeCloseTo(0.36, 12);
    expect(d.n).toBe(40);
  });
  it("하루 관측 30 미만·비유한 값은 뺀다", () => {
    const few = Array.from({ length: 29 }, (_, i) => ({ date: "2024-01-02", ticker: String(i), x: i, y: i }));
    expect(featureDateStats(few)).toHaveLength(0);
    const withNaN = [...few, { date: "2024-01-02", ticker: "x", x: Number.NaN, y: 1 }];
    expect(featureDateStats(withNaN)).toHaveLength(0);
  });
});

describe("탐색 피처 판정", () => {
  const f = (o: Partial<FeatureSummary>): FeatureSummary => ({
    days: 400, meanIC: 0.03, nwT: 3, spread: 0.004, posDays: 0.62, icByYear: { "2024": 0.02, "2025": 0.04 }, ...o,
  });
  it("발견 — 정방향 4조건", () => {
    expect(judgeFeatureDiscovery(f({}), 1).pass).toBe(true);
    expect(judgeFeatureDiscovery(f({ nwT: 2.72 }), 1).pass).toBe(false);
    expect(judgeFeatureDiscovery(f({ spread: 0.0027 }), 1).pass).toBe(false);
    expect(judgeFeatureDiscovery(f({ posDays: 0.59 }), 1).pass).toBe(false);
    expect(judgeFeatureDiscovery(f({ icByYear: { "2024": -0.01, "2025": 0.04 } }), 1).pass).toBe(false);
  });
  it("발견 — 역방향은 부호·안정성을 뒤집어 본다", () => {
    const neg = f({ meanIC: -0.03, nwT: -3, spread: -0.004, posDays: 0.38, icByYear: { "2024": -0.02, "2025": -0.03 } });
    expect(judgeFeatureDiscovery(neg, -1).pass).toBe(true);
    expect(judgeFeatureDiscovery(neg, 1).pass).toBe(false);
  });
  it("홀드아웃 — IC 부호 · 일자 안정성 ≥ 55% · 스프레드 부호", () => {
    expect(judgeFeatureHoldout(f({ posDays: 0.55, spread: 0.0001 }), 1).pass).toBe(true);
    expect(judgeFeatureHoldout(f({ posDays: 0.54 }), 1).pass).toBe(false);
    expect(judgeFeatureHoldout(f({ meanIC: -0.01 }), 1).pass).toBe(false);
  });
  it("summarizeFeature — 연도별 IC", () => {
    const s = summarizeFeature([
      { date: "2024-01-02", ic: 0.1, spread: 0.01, n: 40 },
      { date: "2025-01-02", ic: -0.1, spread: -0.01, n: 40 },
    ]);
    expect(s.icByYear).toEqual({ "2024": 0.1, "2025": -0.1 });
    expect(s.posDays).toBe(0.5);
  });
});

describe("judgeConfirm — 확인 가설", () => {
  const series = (vals: Array<[string, number]>) => vals.map(([date, value]) => ({ date, value }));
  it("진입 100 미만이면 판정 불가", () => {
    expect(judgeConfirm(series([["2022-01-03", 0.01]]), 99, 1).verdict).toBe("판정 불가");
  });
  it("음(−) 방향 — 평균 < 0 · −NW t ≥ 2.24 · 음수 달 비율 ≥ 55%", () => {
    const vals: Array<[string, number]> = [];
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= 10; d++) vals.push([`2022-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, -0.005 + (d % 2 ? 0.001 : -0.001)]);
    const r = judgeConfirm(series(vals), 120, -1);
    expect(r.verdict).toBe("통과");
    expect(r.monthShare).toBe(1);
    expect(judgeConfirm(series(vals), 120, 1).verdict).toBe("미달");
  });
});
