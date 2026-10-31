/**
 * 방향 품질 진단 순수 계산 — 손계산 가능한 작은 시드로 검증.
 * 판정 경계는 사전 등록(`docs/analysis/ai-direction-diagnosis-preregistration.md`) §2 기준.
 */

import { describe, it, expect } from "vitest";
import {
  averageRanks,
  clusterBootstrapCI,
  demeanByGroup,
  directionScore,
  isHoldAdvice,
  isoWeekKey,
  judgeA1,
  judgeA3,
  judgeA4,
  judgeA5,
  judgeB1,
  judgeB2,
  judgeB3,
  median,
  mulberry32,
  neweyWestT,
  quantile,
  spearman,
  splitTerciles,
  weekMatchedGate,
} from "@/lib/server/scorecard/directionDiagnosis";
import type { ScorecardRow } from "@/lib/types/scorecard/scorecard";

describe("공통 정의", () => {
  it("방향 점수 d", () => {
    expect(directionScore("BUY")).toBe(1);
    expect(directionScore("OVERWEIGHT")).toBe(1);
    expect(directionScore("HOLD")).toBe(0);
    expect(directionScore("UNDERWEIGHT")).toBe(-1);
    expect(directionScore("REDUCE")).toBe(-1);
    expect(directionScore("SELL")).toBe(-1);
  });

  it("ISO 주 키 = 그 주 월요일", () => {
    expect(isoWeekKey("2026-07-29")).toBe("2026-07-27"); // 수
    expect(isoWeekKey("2026-07-27")).toBe("2026-07-27"); // 월
    expect(isoWeekKey("2026-08-02")).toBe("2026-07-27"); // 일
  });
});

describe("기초 통계", () => {
  it("중앙값·분위수(type 7)", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([0, 10], 0.975)).toBeCloseTo(9.75);
  });

  it("평균 순위 — 동점은 순위 평균", () => {
    expect(averageRanks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });

  it("Spearman — 단조 증가 1, 단조 감소 −1, 분산 0 NaN", () => {
    expect(spearman([1, 2, 3], [10, 40, 90])).toBeCloseTo(1);
    expect(spearman([1, 2, 3], [9, 4, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNaN();
  });

  it("Spearman 동점 — d=[−1,−1,1,1] vs y=[1,2,3,4] = 2/√5", () => {
    // 순위 x=[1.5,1.5,3.5,3.5], y=[1,2,3,4] → Pearson = 4/√(4·5)
    expect(spearman([-1, -1, 1, 1], [1, 2, 3, 4])).toBeCloseTo(2 / Math.sqrt(5));
  });

  it("그룹 demean", () => {
    expect(demeanByGroup([1, 3, 10], ["a", "a", "b"])).toEqual([-1, 1, 0]);
  });

  it("3분위 — 행 기준 round(n/3) 경계", () => {
    const [lo, mid, hi] = splitTerciles([5, 1, 4, 2, 3, 6, 7], (x) => x);
    expect(lo).toEqual([1, 2]);
    expect(mid).toEqual([3, 4, 5]);
    expect(hi).toEqual([6, 7]);
  });
});

describe("부트스트랩", () => {
  it("mulberry32 는 같은 시드에서 같은 수열", () => {
    const a = mulberry32(20261018);
    const b = mulberry32(20261018);
    const xs = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(xs);
    xs.forEach((x) => expect(x >= 0 && x < 1).toBe(true));
  });

  it("클러스터가 하나면 모든 재표집이 같은 값 → 구간 폭 0", () => {
    const r = clusterBootstrapCI([1, 2, 3], () => "w", (s) => s.length, 50, 1);
    expect(r).toEqual({ lo: 3, hi: 3, valid: 50, iterations: 50 });
  });

  it("NaN 재표집은 버리고 결정론적이다", () => {
    const items = [
      { w: "a", v: 1 },
      { w: "b", v: 2 },
    ];
    const stat = (s: typeof items) => (s.every((x) => x.v === s[0].v) ? Number.NaN : 1);
    const r1 = clusterBootstrapCI(items, (x) => x.w, stat, 200, 7);
    const r2 = clusterBootstrapCI(items, (x) => x.w, stat, 200, 7);
    expect(r1).toEqual(r2);
    expect(r1.valid).toBeLessThan(200);
    expect(r1.lo).toBe(1);
  });
});

describe("H-A1 텍스트 분류", () => {
  it("보유 계열 매칭 그리고 매도 계열 미매칭", () => {
    expect(isHoldAdvice("보유자는 기존 비중을 유지하세요")).toBe(true);
    expect(isHoldAdvice("관망하며 지켜보세요")).toBe(true);
    expect(isHoldAdvice("보유자는 비중을 절반 축소")).toBe(false);
    expect(isHoldAdvice("비중 감소를 권합니다, 유지는 비권장")).toBe(false);
    expect(isHoldAdvice("손절선 이탈 시 청산")).toBe(false);
    expect(isHoldAdvice("")).toBe(false);
    expect(isHoldAdvice(null)).toBe(false);
  });
});

function row(verdict: ScorecardRow["verdict"], entryDate: string, ret: number): ScorecardRow {
  return {
    verdict,
    entryDate,
    w2Status: "hit",
    w2ReturnPct: ret,
  } as ScorecardRow;
}

describe("진입 주 매칭 게이트", () => {
  it("주별 찍기를 n 가중 — 강세 2건(주1 찍기 1/2, 주2 찍기 1/1)", () => {
    // 주1(07-27): OW +1, UW −1 → up 1/2. 주2(08-03): OW +2 → up 1/1.
    const g = weekMatchedGate([
      row("OVERWEIGHT", "2026-07-28", 1),
      row("UNDERWEIGHT", "2026-07-29", -1),
      row("OVERWEIGHT", "2026-08-04", 2),
    ]);
    expect(g.bull.n).toBe(2);
    expect(g.bull.hitRate).toBe(1);
    expect(g.bull.baseRate).toBeCloseTo(0.75); // (1×0.5 + 1×1)/2
    expect(g.bear.n).toBe(1);
    expect(g.bear.baseRate).toBeCloseTo(0.5);
  });
});

describe("판정 규칙 경계", () => {
  it("H-A1", () => {
    expect(judgeA1(9, 1)).toBe("판정 불가");
    expect(judgeA1(10, 0.6)).toBe("지지");
    expect(judgeA1(10, 0.3)).toBe("기각");
    expect(judgeA1(10, 0.45)).toBe("판정 불가");
  });

  it("H-A3", () => {
    expect(judgeA3(14, 30)).toBe("판정 불가");
    expect(judgeA3(15, 15)).toBe("지지");
    expect(judgeA3(15, 4.9)).toBe("기각");
    expect(judgeA3(15, -20)).toBe("기각");
    expect(judgeA3(15, 10)).toBe("판정 불가");
  });

  it("H-A4", () => {
    expect(judgeA4(0.2, 5, null)).toBe("기각");
    expect(judgeA4(0.3, 15, 0.2)).toBe("지지");
    expect(judgeA4(0.3, 14, 0.0)).toBe("판정 불가");
    expect(judgeA4(0.3, 20, 0.25)).toBe("판정 불가");
  });

  it("H-A5", () => {
    expect(judgeA5(100, 14, 50)).toBe("판정 불가");
    expect(judgeA5(100, 15, 10)).toBe("지지");
    expect(judgeA5(100, 15, 2.9)).toBe("기각");
    expect(judgeA5(100, 15, -5)).toBe("기각");
    expect(judgeA5(100, 15, 5)).toBe("판정 불가");
  });

  it("H-B1", () => {
    expect(judgeB1(5, -0.1, 0.1)).toBe("판정 불가");
    expect(judgeB1(6, -0.1, 0.1)).toBe("지지");
    expect(judgeB1(6, 0.01, 0.2)).toBe("기각");
    expect(judgeB1(6, -0.3, -0.1)).toBe("지지");
  });

  it("H-B2", () => {
    expect(judgeB2(10)).toBe("지지");
    expect(judgeB2(2.9)).toBe("기각");
    expect(judgeB2(5)).toBe("판정 불가");
  });

  it("H-B3", () => {
    expect(judgeB3(14, -10, 0.1, 0.5)).toBe("판정 불가");
    expect(judgeB3(15, -5, 0.4, 0.5)).toBe("지지");
    expect(judgeB3(15, -5, 0.6, 0.5)).toBe("판정 불가");
    expect(judgeB3(15, -1, 0.1, 0.5)).toBe("기각");
    expect(judgeB3(15, -3, 0.1, 0.5)).toBe("판정 불가");
  });
});

describe("neweyWestT", () => {
  it("lag 0 — 평균 ÷ √(편향 분산/n) 손계산 일치", () => {
    // [1,2,3,4]: 평균 2.5, γ0 = 1.25 → t = 2.5 / √(1.25/4) = √20
    expect(neweyWestT([1, 2, 3, 4], 0)).toBeCloseTo(Math.sqrt(20), 10);
  });

  it("양의 자기상관이면 lag 를 늘릴수록 |t| 가 작아진다", () => {
    const xs = [2, 2, 2, 0, 0, 0, 2, 2, 2, 0, 0, 0];
    const t0 = neweyWestT(xs, 0);
    const t2 = neweyWestT(xs, 2);
    expect(t2).toBeGreaterThan(0);
    expect(t2).toBeLessThan(t0);
  });

  it("분산 0 이면 NaN", () => {
    expect(neweyWestT([1, 1, 1], 2)).toBeNaN();
  });
});
