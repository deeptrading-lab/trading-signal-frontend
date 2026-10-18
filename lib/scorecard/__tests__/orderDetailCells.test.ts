import { describe, it, expect } from "vitest";
import { orderDetailCells } from "@/lib/scorecard/orderDetailCells";
import type { ScorecardSummaryCell } from "@/lib/types/scorecard/scorecard";

const cell = (
  dimension: ScorecardSummaryCell["dimension"],
  key: string,
  horizon: ScorecardSummaryCell["horizon"],
  total: number,
): ScorecardSummaryCell => ({
  dimension,
  key,
  horizon,
  total,
  hit: 0,
  miss: 0,
  flat: 0,
  hitRate: null,
  absHitRate: null,
  absSample: 0,
});

const order = (cells: ScorecardSummaryCell[]) => cells.map((c) => `${c.key}:${c.horizon}`);

describe("orderDetailCells", () => {
  it("시점별 표본이 달라도 같은 구분은 한 그룹으로 이어지고, 그룹 안은 1일→1주→2주→1달", () => {
    // #396 QA 시드 — BUY 12/8/5/3, HOLD 전부 9. 셀 total 정렬이면 BUY 가 1행 + 3행으로 갈라졌다.
    const cells = [
      cell("verdict", "BUY", "m1", 3),
      cell("verdict", "HOLD", "d1", 9),
      cell("verdict", "BUY", "w1", 8),
      cell("verdict", "HOLD", "w2", 9),
      cell("verdict", "BUY", "d1", 12),
      cell("verdict", "HOLD", "m1", 9),
      cell("verdict", "BUY", "w2", 5),
      cell("verdict", "HOLD", "w1", 9),
    ];
    expect(order(orderDetailCells(cells, "verdict", "all"))).toEqual([
      "BUY:d1",
      "BUY:w1",
      "BUY:w2",
      "BUY:m1",
      "HOLD:d1",
      "HOLD:w1",
      "HOLD:w2",
      "HOLD:m1",
    ]);
  });

  it("평가 시점 필터는 그 시점만, 다른 차원 셀은 제외", () => {
    const cells = [
      cell("verdict", "BUY", "d1", 12),
      cell("verdict", "BUY", "w2", 5),
      cell("regime", "down", "w2", 50),
    ];
    expect(order(orderDetailCells(cells, "verdict", "w2"))).toEqual(["BUY:w2"]);
  });

  it("평가 시점별 차원은 필터 무관 + 시점 순", () => {
    const cells = [
      cell("horizon", "m1", "m1", 42),
      cell("horizon", "d1", "d1", 130),
      cell("horizon", "w2", "w2", 130),
      cell("horizon", "w1", "w1", 130),
    ];
    expect(order(orderDetailCells(cells, "horizon", "w1"))).toEqual([
      "d1:d1",
      "w1:w1",
      "w2:w2",
      "m1:m1",
    ]);
  });
});
