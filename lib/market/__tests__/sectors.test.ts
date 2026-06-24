/**
 * `lib/market/sectors.ts` `computeSectorPerf` 단위테스트.
 *
 * PRD `market-snapshot` AC-3 — 바스켓 동일가중 평균·up/down 카운트·부분 성공 회귀 차단.
 */

import { describe, it, expect } from "vitest";
import { computeSectorPerf, type QuoteLite } from "../sectors";
import type { ThemeBasket } from "../baskets";

const BASKETS: ThemeBasket[] = [
  {
    key: "alpha",
    label: "알파",
    members: [
      ["A", "에이"],
      ["B", "비"],
      ["C", "씨"],
    ],
  },
  {
    key: "beta",
    label: "베타",
    members: [
      ["D", "디"],
      ["E", "이"],
    ],
  },
];

function quotes(entries: Record<string, number>): Map<string, QuoteLite> {
  return new Map(Object.entries(entries).map(([t, c]) => [t, { changePercent: c }]));
}

const names = new Map<string, string>([
  ["A", "에이"],
  ["B", "비"],
  ["C", "씨"],
  ["D", "디"],
  ["E", "이"],
]);

describe("computeSectorPerf", () => {
  it("동일가중 평균·상승/하락 카운트·leaders 정렬", () => {
    const result = computeSectorPerf(
      quotes({ A: 2, B: -1, C: 5, D: 0, E: 0 }),
      BASKETS,
      names,
    );
    const alpha = result.find((s) => s.key === "alpha")!;
    expect(alpha.changePct).toBe(2); // (2-1+5)/3
    expect(alpha.upCount).toBe(2);
    expect(alpha.downCount).toBe(1);
    expect(alpha.memberCount).toBe(3);
    expect(alpha.weightMode).toBe("equal");
    // leaders: 등락률 내림차순 C(5) > A(2) > B(-1).
    expect(alpha.leaders.map((l) => l.ticker)).toEqual(["C", "A", "B"]);
  });

  it("시세 누락 종목은 평균·카운트에서 제외(부분 성공)", () => {
    const result = computeSectorPerf(quotes({ A: 2, B: -1 }), BASKETS, names);
    const alpha = result.find((s) => s.key === "alpha")!;
    expect(alpha.memberCount).toBe(2);
    expect(alpha.changePct).toBe(0.5); // (2-1)/2
  });

  it("시세 0종목 바스켓은 결과에서 스킵", () => {
    const result = computeSectorPerf(quotes({ A: 1 }), BASKETS, names);
    expect(result.find((s) => s.key === "beta")).toBeUndefined();
  });

  it("바스켓 간 changePct 내림차순 정렬", () => {
    const result = computeSectorPerf(
      quotes({ A: -3, B: -3, C: -3, D: 4, E: 4 }),
      BASKETS,
      names,
    );
    expect(result.map((s) => s.key)).toEqual(["beta", "alpha"]); // beta +4 > alpha -3
  });

  it("nameByTicker 로 표시명 주입", () => {
    const result = computeSectorPerf(quotes({ A: 1 }), BASKETS, new Map([["A", "삼성"]]));
    const alpha = result.find((s) => s.key === "alpha")!;
    expect(alpha.leaders[0].name).toBe("삼성");
  });
});
