/**
 * 시장/베타 보정 채점 순수 로직 단위 테스트 — PRD `scorecard-relative-scoring`.
 *
 * dailyReturns / excess / beta / alpha / regime 분류 / 모드 선택 / ±T 경계 / fail-soft(null).
 */

import { describe, it, expect } from "vitest";
import {
  dailyReturns,
  computeExcessReturn,
  estimateBeta,
  computeAlphaResidual,
  classifyRegime,
  selectScoringMetric,
  scoreRelativeOutcome,
  measureRelative,
} from "@/lib/server/scorecard/relativeScoring";

const T = 2;

describe("dailyReturns", () => {
  it("종가 [100,110,99] → [+0.1, -0.1]", () => {
    const r = dailyReturns([100, 110, 99]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(0.1, 6);
    expect(r[1]).toBeCloseTo(-0.1, 6);
  });
  it("0 이하·비유한 구간은 건너뛴다", () => {
    const r = dailyReturns([100, 0, 110, NaN, 121]);
    // 100→0(prev 양수,cur 0 → 포함됨: (0-100)/100=-1), 0→110(prev 0 → skip),
    // 110→NaN(skip), NaN→121(prev NaN → skip)
    expect(r).toEqual([-1]);
  });
  it("길이 1 이하 → 빈 배열", () => {
    expect(dailyReturns([100])).toEqual([]);
    expect(dailyReturns([])).toEqual([]);
  });
});

describe("computeExcessReturn — abs − bench", () => {
  it("abs +3, bench +1 → excess +2", () => {
    expect(computeExcessReturn(3, 1)).toBeCloseTo(2, 6);
  });
  it("abs -1, bench -3 → excess +2 (시장 더 빠졌으면 초과수익 +)", () => {
    expect(computeExcessReturn(-1, -3)).toBeCloseTo(2, 6);
  });
  it("입력 null/비유한 → null(측정 불가)", () => {
    expect(computeExcessReturn(null, 1)).toBeNull();
    expect(computeExcessReturn(3, null)).toBeNull();
    expect(computeExcessReturn(NaN, 1)).toBeNull();
  });
});

describe("estimateBeta — 회귀 기울기", () => {
  it("종목 = 1.5 × 지수 (정확 선형) → β ≈ 1.5", () => {
    const bench = [0.01, -0.02, 0.03, -0.01, 0.02, 0.0, 0.015, -0.005, 0.01, -0.02];
    const stock = bench.map((x) => 1.5 * x);
    expect(estimateBeta(stock, bench, 5)).toBeCloseTo(1.5, 6);
  });
  it("표본 < minPairs → null", () => {
    expect(estimateBeta([0.01, 0.02], [0.01, 0.02], 5)).toBeNull();
  });
  it("지수 무변동(분산 0) → null", () => {
    const bench = new Array(10).fill(0);
    const stock = [0.01, -0.02, 0.03, -0.01, 0.02, 0.0, 0.015, -0.005, 0.01, -0.02];
    expect(estimateBeta(stock, bench, 5)).toBeNull();
  });
});

describe("computeAlphaResidual — abs − β·bench", () => {
  it("abs +3, bench +2, β 1 → 잔차 +1", () => {
    expect(computeAlphaResidual(3, 2, 1)).toBeCloseTo(1, 6);
  });
  it("β null → null(beta_adjusted 측정 불가)", () => {
    expect(computeAlphaResidual(3, 2, null)).toBeNull();
  });
});

describe("classifyRegime — 벤치 기준 up/down/flat (T_regime=1.5)", () => {
  it("bench +1.5 → up(경계 포함)", () => expect(classifyRegime(1.5, 1.5)).toBe("up"));
  it("bench -1.5 → down(경계 포함)", () => expect(classifyRegime(-1.5, 1.5)).toBe("down"));
  it("bench +1.0 → flat", () => expect(classifyRegime(1.0, 1.5)).toBe("flat"));
  it("bench 0 → flat", () => expect(classifyRegime(0, 1.5)).toBe("flat"));
  it("bench null → null", () => expect(classifyRegime(null, 1.5)).toBeNull());
});

describe("selectScoringMetric — 모드별 지표 선택", () => {
  const metrics = { absReturnPct: 5, excessReturnPct: 2, alphaResidualPct: 1 };
  it("absolute → abs", () => expect(selectScoringMetric("absolute", metrics)).toBe(5));
  it("excess → excess", () => expect(selectScoringMetric("excess", metrics)).toBe(2));
  it("beta_adjusted → alpha", () =>
    expect(selectScoringMetric("beta_adjusted", metrics)).toBe(1));
  it("beta_adjusted + alpha null → excess 폴백", () =>
    expect(
      selectScoringMetric("beta_adjusted", { ...metrics, alphaResidualPct: null }),
    ).toBe(2));
});

describe("scoreRelativeOutcome — 상대 지표를 ±T 로 판정(phase-1 규칙 재사용)", () => {
  it("BUY excess +T → hit (경계 포함)", () =>
    expect(scoreRelativeOutcome("BUY", T, T)).toBe("hit"));
  it("BUY excess -T → miss (경계 포함)", () =>
    expect(scoreRelativeOutcome("BUY", -T, T)).toBe("miss"));
  it("BUY excess 0 → flat", () => expect(scoreRelativeOutcome("BUY", 0, T)).toBe("flat"));
  it("UNDERWEIGHT excess -1 → hit (약세군: ≤0)", () =>
    expect(scoreRelativeOutcome("UNDERWEIGHT", -1, T)).toBe("hit"));
  it("지표 null → null(보류)", () =>
    expect(scoreRelativeOutcome("BUY", null, T)).toBeNull());
});

describe("measureRelative — 통합 측정 + status", () => {
  it("시장 베타 함정: 시장 -5%, 종목 -4%, UNDERWEIGHT — 절대론 hit 이지만 excess +1 → flat", () => {
    // abs -4 (UNDERWEIGHT abs: r≤0 → absHit), 하지만 excess = -4-(-5)=+1 → 0<+1≤T 라 flat.
    const m = measureRelative({
      verdict: "UNDERWEIGHT",
      absReturnPct: -4,
      benchReturnPct: -5,
      beta: null,
      mode: "excess",
      threshold: T,
    });
    expect(m.absReturnPct).toBe(-4);
    expect(m.excessReturnPct).toBeCloseTo(1, 6);
    expect(m.regime).toBe("down");
    expect(m.status).toBe("flat"); // 시장 따라 내린 것 — 알파 미입증
  });

  it("진짜 알파: 시장 -5%, 종목 +1%, OVERWEIGHT — excess +6 → hit", () => {
    const m = measureRelative({
      verdict: "OVERWEIGHT",
      absReturnPct: 1,
      benchReturnPct: -5,
      beta: null,
      mode: "excess",
      threshold: T,
    });
    expect(m.excessReturnPct).toBeCloseTo(6, 6);
    expect(m.status).toBe("hit");
  });

  it("bench null(지수 부재) → excess null → status null(보류, fail-soft)", () => {
    const m = measureRelative({
      verdict: "BUY",
      absReturnPct: 3,
      benchReturnPct: null,
      beta: null,
      mode: "excess",
      threshold: T,
    });
    expect(m.status).toBeNull();
    expect(m.metricUsed).toBeNull();
  });

  it("beta_adjusted: β=1.2, abs +3, bench +2 → 잔차 +0.6 → BUY flat", () => {
    const m = measureRelative({
      verdict: "BUY",
      absReturnPct: 3,
      benchReturnPct: 2,
      beta: 1.2,
      mode: "beta_adjusted",
      threshold: T,
    });
    expect(m.alphaResidualPct).toBeCloseTo(3 - 1.2 * 2, 6); // 0.6
    expect(m.status).toBe("flat");
  });

  it("beta_adjusted + β null → excess 폴백 (반쯤 만든 상태 금지)", () => {
    const m = measureRelative({
      verdict: "BUY",
      absReturnPct: 5,
      benchReturnPct: 2,
      beta: null,
      mode: "beta_adjusted",
      threshold: T,
    });
    // alpha null → excess(=3) 로 판정 → +3 ≥ T 라 hit.
    expect(m.alphaResidualPct).toBeNull();
    expect(m.metricUsed).toBeCloseTo(3, 6);
    expect(m.status).toBe("hit");
  });
});
