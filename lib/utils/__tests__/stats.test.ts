/** 감사용 기초 통계 — 옛 directionDiagnosis 테스트에서 옮긴 손계산 케이스(swing-judgment PR-5). */

import { describe, expect, it } from "vitest";
import { averageRanks, isoWeekKey, mean, median, mulberry32, neweyWestT, quantile, spearman, toPp } from "../stats";

describe("기초 통계", () => {
  it("ISO 주 키 = 그 주 월요일", () => {
    expect(isoWeekKey("2026-07-29")).toBe("2026-07-27"); // 수
    expect(isoWeekKey("2026-07-27")).toBe("2026-07-27"); // 월
    expect(isoWeekKey("2026-08-02")).toBe("2026-07-27"); // 일
  });

  it("평균·중앙값·분위수(type 7)·%p", () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 2, 3])).toBe(2);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([0, 10], 0.975)).toBeCloseTo(9.75);
    expect(toPp(0.3, 0.2)).toBe(10);
  });

  it("평균 순위 — 동점은 순위 평균", () => {
    expect(averageRanks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });

  it("Spearman — 단조 1, 역단조 −1, 분산 0 NaN, 동점 2/√5", () => {
    expect(spearman([1, 2, 3], [10, 40, 90])).toBeCloseTo(1);
    expect(spearman([1, 2, 3], [9, 4, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNaN();
    expect(spearman([-1, -1, 1, 1], [1, 2, 3, 4])).toBeCloseTo(2 / Math.sqrt(5));
  });

  it("mulberry32 — 같은 시드 같은 수열, [0,1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe("neweyWestT", () => {
  it("lag 0 — 평균 ÷ √(편향 분산/n) 손계산 일치", () => {
    // [1,2,3,4]: 평균 2.5, γ0 = 1.25 → t = 2.5 / √(1.25/4) = √20
    expect(neweyWestT([1, 2, 3, 4], 0)).toBeCloseTo(Math.sqrt(20), 10);
  });
  it("양의 자기상관이면 lag 를 늘릴수록 |t| 가 작아진다", () => {
    const xs = [2, 2, 2, 0, 0, 0, 2, 2, 2, 0, 0, 0];
    expect(neweyWestT(xs, 2)).toBeLessThan(neweyWestT(xs, 0));
  });
  it("분산 0 이면 NaN", () => {
    expect(neweyWestT([1, 1, 1], 2)).toBeNaN();
  });
});
