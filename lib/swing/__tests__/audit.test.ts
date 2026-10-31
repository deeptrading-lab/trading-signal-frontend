import { describe, it, expect } from "vitest";
import {
  AUDIT,
  applyCooldown,
  cohortStats,
  dailyMeans,
  forwardReturn,
  isUniverseMember,
  judgeDiscovery,
  judgeHoldout,
  judgePlan,
  periodOf,
  releaseMode,
  weekClusterRateCI,
  type CohortStats,
} from "../audit";
import { judgeSwing } from "../judge";
import { RULEBOOK } from "../rulebook";
import { flatCloses, makeInput } from "./_swingFixtures";

describe("periodOf", () => {
  it("구간 경계(양 끝 포함)", () => {
    expect(periodOf("2021-12-30")).toBeNull();
    expect(periodOf("2022-01-03")).toBe("H1");
    expect(periodOf("2023-12-28")).toBe("H1");
    expect(periodOf("2024-01-02")).toBe("D");
    expect(periodOf("2025-12-30")).toBe("D");
    expect(periodOf("2026-08-10")).toBe("H2");
    expect(periodOf("2026-08-11")).toBe("H3");
    expect(periodOf("2026-10-16")).toBe("H3");
    expect(periodOf("2026-10-19")).toBeNull();
  });
});

describe("isUniverseMember — 판정의 데이터 부족·유동성 제외와 같은 조건", () => {
  const cases = [
    makeInput(flatCloses(10_000, 320)),
    makeInput(flatCloses(10_000, 320), { flow: { tradingValue: 2_000_000_000 } }),
    makeInput(flatCloses(10_000, 250)),
    makeInput(flatCloses(900, 320)),
    (() => {
      const x = makeInput(flatCloses(10_000, 320));
      x.flow = x.flow.filter((_, i) => i !== 310);
      return x;
    })(),
  ];
  it.each(cases.map((c, k) => [k, c] as const))("케이스 %i", (_k, input) => {
    const i = input.bars.length - 1;
    const member = isUniverseMember(input.bars, new Map(input.flow.map((f) => [f.date, f])), i, RULEBOOK);
    const j = judgeSwing(input);
    const excluded = j.exclusions.includes("insufficient_data") || j.exclusions.includes("illiquid");
    expect(member).toBe(!excluded);
  });
});

describe("forwardReturn · applyCooldown · dailyMeans", () => {
  it("t+1 시가 → t+h 종가, 봉 부족이면 null", () => {
    const bars = makeInput(flatCloses(10_000, 20, 0)).bars;
    bars[6].open = 9_000;
    bars[15].close = 9_900;
    expect(forwardReturn(bars, 5, 10)).toBeCloseTo(9_900 / 9_000 - 1, 12);
    expect(forwardReturn(bars, 10, 10)).toBeNull();
  });

  it("쿨다운 10봉 — 재신호는 10봉 지나야 진입", () => {
    expect(applyCooldown([1, 2, 5, 11, 12, 21, 40], AUDIT.cooldownBars)).toEqual([1, 11, 21, 40]);
  });

  it("같은 날 여러 진입은 평균 하나", () => {
    expect(
      dailyMeans([
        { date: "2024-01-03", value: 2 },
        { date: "2024-01-02", value: 1 },
        { date: "2024-01-03", value: 4 },
      ]),
    ).toEqual([
      { date: "2024-01-02", value: 1, n: 1 },
      { date: "2024-01-03", value: 3, n: 2 },
    ]);
  });
});

describe("cohortStats", () => {
  it("월 안정성 = 월 평균이 양(+)인 달 비율 · 연도별 평균", () => {
    const s = cohortStats([
      { date: "2024-01-02", value: 0.01 },
      { date: "2024-01-03", value: -0.005 },
      { date: "2024-02-01", value: -0.01 },
      { date: "2025-03-04", value: 0.02 },
    ]);
    expect(s.days).toBe(4);
    expect(s.months).toBe(3);
    expect(s.monthStability).toBeCloseTo(2 / 3, 12);
    expect(s.byYear["2024"].days).toBe(3);
    expect(s.byYear["2025"].mean).toBeCloseTo(0.02, 12);
    expect(s.dayStability).toBe(0.5);
  });
});

describe("판정 규칙(사전 등록 §4)", () => {
  const stats = (o: Partial<CohortStats>): CohortStats => ({
    days: 200,
    mean: 0.004,
    median: 0.003,
    nwT: 3,
    monthStability: 0.7,
    months: 24,
    dayStability: 0.55,
    byYear: { "2024": { days: 100, mean: 0.003 }, "2025": { days: 100, mean: 0.005 } },
    ...o,
  });

  it("발견 — 진입 300·진입일 150 미만이면 판정 불가", () => {
    expect(judgeDiscovery(299, stats({})).verdict).toBe("판정 불가");
    expect(judgeDiscovery(400, stats({ days: 149 })).verdict).toBe("판정 불가");
  });
  it("발견 — 5개 조건 모두 충족해야 통과(경계 포함)", () => {
    expect(judgeDiscovery(300, stats({ mean: 0.0028, nwT: 2.24, monthStability: 0.6 })).verdict).toBe("통과");
    expect(judgeDiscovery(300, stats({ mean: 0.00279 })).verdict).toBe("미달");
    expect(judgeDiscovery(300, stats({ nwT: 2.23 })).verdict).toBe("미달");
    expect(judgeDiscovery(300, stats({ monthStability: 0.59 })).verdict).toBe("미달");
    expect(judgeDiscovery(300, stats({ byYear: { "2024": { days: 100, mean: -0.001 }, "2025": { days: 100, mean: 0.01 } } })).verdict).toBe("미달");
    expect(judgeDiscovery(300, stats({ nwT: Number.NaN })).verdict).toBe("미달");
  });
  it("홀드아웃 — 진입 100 미만 판정 불가, 평균 > 0 · 월 안정성 ≥ 55%", () => {
    expect(judgeHoldout(99, stats({})).verdict).toBe("판정 불가");
    expect(judgeHoldout(100, stats({ monthStability: 0.55 })).verdict).toBe("통과");
    expect(judgeHoldout(100, stats({ mean: 0 })).verdict).toBe("미달");
  });
  it("계획 경로 — 발견 평균 > 0 · 월 안정성 ≥ 55% · 홀드아웃 평균 > 0", () => {
    expect(judgePlan(stats({}), null).verdict).toBe("통과");
    expect(judgePlan(stats({ monthStability: 0.5 }), null).verdict).toBe("미달");
    expect(judgePlan(stats({}), stats({ mean: -0.001 })).verdict).toBe("미달");
  });
  it("결정표", () => {
    expect(releaseMode("통과", "통과", "통과")).toBe("graded");
    expect(releaseMode("통과", "통과", "미달")).toBe("graded_reference_levels");
    expect(releaseMode("통과", "미달", null)).toBe("checklist");
    expect(releaseMode("미달", null, null)).toBe("checklist");
    expect(releaseMode("판정 불가", null, null)).toBe("checklist");
  });
});

describe("weekClusterRateCI", () => {
  it("결정론(같은 시드 같은 구간) · 구간이 비율을 감싼다", () => {
    const weeks = Array.from({ length: 50 }, (_, i) => ({ hits: i % 3 === 0 ? 6 : 4, n: 10 }));
    const a = weekClusterRateCI(weeks, 500, 7);
    const b = weekClusterRateCI(weeks, 500, 7);
    expect(a).toEqual(b);
    const rate = weeks.reduce((s, w) => s + w.hits, 0) / weeks.reduce((s, w) => s + w.n, 0);
    expect(a.lo!).toBeLessThanOrEqual(rate);
    expect(a.hi!).toBeGreaterThanOrEqual(rate);
  });
  it("빈 입력이면 null", () => {
    expect(weekClusterRateCI([], 100, 1)).toEqual({ lo: null, hi: null });
  });
});
