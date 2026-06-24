/**
 * `lib/market/concentration.ts` `computeConcentration` 단위테스트.
 *
 * PRD `market-snapshot` AC-2 — 기여도(weight×등락률)·상위N 비중·해석 분류 회귀 차단.
 */

import { describe, it, expect } from "vitest";
import { computeConcentration, type QuoteLite } from "../concentration";
import type { MegacapMember } from "../baskets";

const MEGACAP: MegacapMember[] = [
  { ticker: "A", name: "에이", weight: 50 },
  { ticker: "B", name: "비", weight: 30 },
  { ticker: "C", name: "씨", weight: 20 },
];

function quotes(entries: Record<string, number>): Map<string, QuoteLite> {
  return new Map(Object.entries(entries).map(([t, c]) => [t, { changePercent: c }]));
}

describe("computeConcentration", () => {
  it("상승장 — 기여도·상위N 비중·very_narrow 분류", () => {
    // 정규화 가중치 A=.5 B=.3 C=.2. 기여 A=.5*2=1.0, B=.3*1=.3, C=.2*.5=.1.
    // netTotal=1.4(up). dirTotal=1.4. top1=A(1.0) → 71.4%.
    const c = computeConcentration(quotes({ A: 2, B: 1, C: 0.5 }), MEGACAP, 1, "2026-06-24")!;
    expect(c.direction).toBe("up");
    expect(c.contributors[0].ticker).toBe("A");
    expect(c.contributors[0].contribution).toBe(1);
    expect(c.topNContributionPct).toBe(71.4);
    expect(c.interpretation).toBe("very_narrow");
    expect(c.basis).toBe("kospi_top_mcap");
    expect(c.asOf).toBe("2026-06-24");
  });

  it("기여도 |절대값| 내림차순 정렬", () => {
    const c = computeConcentration(quotes({ A: 0.1, B: 5, C: 0.1 }), MEGACAP, 2, "x")!;
    // 기여 A=.05, B=.3*5=1.5, C=.02 → B 최상위.
    expect(c.contributors[0].ticker).toBe("B");
  });

  it("하락장 — direction down, 음(-)기여 기준 비중", () => {
    const c = computeConcentration(quotes({ A: -2, B: -1, C: -0.5 }), MEGACAP, 1, "x")!;
    expect(c.direction).toBe("down");
    // dirSign=-1. dirMag A=1.0,B=.3,C=.1. dirTotal=1.4. top1=A → 71.4%.
    expect(c.topNContributionPct).toBe(71.4);
  });

  it("넓게 분산되면 broad", () => {
    // 동일 가중·동일 등락 → 상위1 비중 = 1/3 ≈ 33% < 40 → broad.
    const c = computeConcentration(
      quotes({ A: 1, B: 1, C: 1 }),
      [
        { ticker: "A", name: "a", weight: 10 },
        { ticker: "B", name: "b", weight: 10 },
        { ticker: "C", name: "c", weight: 10 },
      ],
      1,
      "x",
    )!;
    expect(c.interpretation).toBe("broad");
  });

  it("누락 종목 제외 후 잔존 가중치 재정규화", () => {
    // C 누락 → A,B 만. 정규화 A=50/80=.625, B=30/80=.375.
    const c = computeConcentration(quotes({ A: 4, B: 0 }), MEGACAP, 1, "x")!;
    expect(c.contributors).toHaveLength(2);
    expect(c.contributors[0].weight).toBeCloseTo(0.625, 3);
  });

  it("시세 0종목 → null", () => {
    expect(computeConcentration(quotes({}), MEGACAP, 1, "x")).toBeNull();
  });
});
