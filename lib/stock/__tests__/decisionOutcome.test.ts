/**
 * decisionOutcome 회귀 — 카드↔원장 매칭(시각 근접·48h 창)과 표시 시점 선택(성숙도 우선)을 고정한다.
 */

import { describe, it, expect } from "vitest";
import {
  pickOutcomeRow,
  selectDecisionOutcome,
  resolveDecisionOutcome,
  type OutcomeCandidate,
} from "@/lib/stock/decisionOutcome";
import type { HorizonStatus, ScorecardHorizon } from "@/lib/types/scorecard/scorecard";

const CARD_AT = "2026-07-13T10:00:00.000Z";

function row(over: {
  decidedAt: string;
  statuses?: Partial<Record<ScorecardHorizon, HorizonStatus>>;
  excess?: Partial<Record<ScorecardHorizon, number | null>>;
}): OutcomeCandidate {
  return {
    ticker: "005930",
    decidedAt: over.decidedAt,
    statuses: { d1: "pending", w1: "pending", w2: "pending", m1: "pending", ...over.statuses },
    excess: { d1: null, w1: null, w2: null, m1: null, ...over.excess },
  };
}

describe("pickOutcomeRow — 카드↔원장 매칭", () => {
  it("시각이 가장 가까운 행을 고른다(재분석으로 여러 행이 쌓여도)", () => {
    const near = row({ decidedAt: "2026-07-13T10:05:00.000Z" });
    const far = row({ decidedAt: "2026-07-13T22:00:00.000Z" });
    expect(pickOutcomeRow([far, near], CARD_AT)).toBe(near);
  });

  it("48시간을 넘게 벌어진 행은 다른 실행으로 보고 붙이지 않는다(오귀속 방지)", () => {
    const stale = row({ decidedAt: "2026-07-10T10:00:00.000Z" }); // 3일 전
    expect(pickOutcomeRow([stale], CARD_AT)).toBeNull();
  });

  it("후보 없음·잘못된 시각 문자열이면 null", () => {
    expect(pickOutcomeRow([], CARD_AT)).toBeNull();
    expect(pickOutcomeRow([row({ decidedAt: "not-a-date" })], CARD_AT)).toBeNull();
    expect(pickOutcomeRow([row({ decidedAt: CARD_AT })], "not-a-date")).toBeNull();
  });
});

describe("selectDecisionOutcome — 표시 시점 선택", () => {
  it("가장 성숙한 채점 완료 시점을 고른다(m1 > w2 > w1 > d1)", () => {
    const r = row({
      decidedAt: CARD_AT,
      statuses: { d1: "hit", w1: "miss", w2: "hit", m1: "pending" },
      excess: { w2: 3.2 },
    });
    const out = selectDecisionOutcome(r)!;
    expect(out.horizon).toBe("w2"); // m1 은 아직 pending
    expect(out.status).toBe("hit");
    expect(out.excessReturnPct).toBe(3.2);
  });

  it("m1 까지 채점됐으면 m1 을 고른다", () => {
    const out = selectDecisionOutcome(
      row({ decidedAt: CARD_AT, statuses: { d1: "hit", w1: "hit", w2: "hit", m1: "miss" } }),
    )!;
    expect(out.horizon).toBe("m1");
    expect(out.status).toBe("miss");
  });

  it("skipped 는 판정 성패가 아니라 데이터 사정 — 건너뛴다", () => {
    const out = selectDecisionOutcome(
      row({ decidedAt: CARD_AT, statuses: { d1: "flat", w1: "skipped", w2: "skipped" } }),
    )!;
    expect(out.horizon).toBe("d1");
    expect(out.status).toBe("flat");
  });

  it("전부 pending/skipped 면 null(카드에 표시 없음)", () => {
    expect(selectDecisionOutcome(row({ decidedAt: CARD_AT }))).toBeNull();
    expect(
      selectDecisionOutcome(row({ decidedAt: CARD_AT, statuses: { d1: "skipped" } })),
    ).toBeNull();
    expect(selectDecisionOutcome(null)).toBeNull();
  });
});

describe("resolveDecisionOutcome — 통합", () => {
  it("매칭 + 선택이 한 번에 동작", () => {
    const out = resolveDecisionOutcome(
      [
        row({ decidedAt: "2026-07-10T10:00:00.000Z", statuses: { m1: "hit" } }), // 창 밖
        row({ decidedAt: "2026-07-13T10:02:00.000Z", statuses: { w1: "miss" }, excess: { w1: -4.1 } }),
      ],
      CARD_AT,
    )!;
    expect(out.horizon).toBe("w1");
    expect(out.status).toBe("miss");
    expect(out.excessReturnPct).toBe(-4.1);
  });
});
