/**
 * 오픈베타 조건(판정 정직성) 자동 항목 — PRD `ai-direction-quality` §10-1.
 * 경계 95% · 28일 창 · 3영업일(주말) · 16일 성숙 · 표본 0.
 */

import { describe, it, expect } from "vitest";
import {
  summarizeBadgeCoverage,
  summarizeCronContinuity,
  summarizeStopLineCoverage,
} from "@/lib/server/scorecard/openBetaConditions";
import type { ScorecardRow } from "@/lib/types/scorecard/scorecard";

// 2026-10-19(월) 10:00 KST.
const NOW = new Date("2026-10-19T01:00:00.000Z");

function row(overrides: Partial<ScorecardRow> = {}): ScorecardRow {
  return {
    ticker: "005930",
    verdict: "UNDERWEIGHT",
    stopLossPct: 5,
    entryDate: "2026-10-10",
    decidedAt: "2026-10-10T06:00:00.000Z",
    runId: null,
    d1Status: "pending",
    w1Status: "pending",
    w2Status: "pending",
    m1Status: "pending",
    d1ExcessReturnPct: null,
    w1ExcessReturnPct: null,
    w2ExcessReturnPct: null,
    m1ExcessReturnPct: null,
    ...overrides,
  } as ScorecardRow;
}

const many = (n: number, o: Partial<ScorecardRow> = {}) => Array.from({ length: n }, () => row(o));

describe("summarizeStopLineCoverage", () => {
  it("표본 0 이면 판정 보류", () => {
    expect(summarizeStopLineCoverage([], NOW)).toMatchObject({ status: "pending", n: 0, rate: null });
  });

  it("95% 경계 — 19/20 통과, 18/20 미달", () => {
    const pass = summarizeStopLineCoverage([...many(19), row({ stopLossPct: null })], NOW);
    expect(pass).toMatchObject({ status: "pass", n: 20, count: 19, rate: 0.95 });
    const fail = summarizeStopLineCoverage([...many(18), ...many(2, { stopLossPct: null })], NOW);
    expect(fail.status).toBe("fail");
  });

  it("28일 창(KST 날짜) 밖·HOLD 는 제외", () => {
    const res = summarizeStopLineCoverage(
      [
        row({ entryDate: "2026-09-21" }), // 오늘 KST 10-19 − 28일 = 09-21 → 포함
        row({ entryDate: "2026-09-20", stopLossPct: null }), // 창 밖
        row({ verdict: "HOLD", stopLossPct: null }), // 방향 판정 아님
        row({ verdict: "BUY" }),
      ],
      NOW,
    );
    expect(res).toMatchObject({ status: "pass", n: 2, count: 2 });
  });
});

describe("summarizeCronContinuity", () => {
  it("조회 실패면 확인 불가, 마커 없으면 미달", () => {
    expect(summarizeCronContinuity("unavailable", NOW)).toMatchObject({ status: "unknown" });
    expect(summarizeCronContinuity(null, NOW)).toMatchObject({ status: "fail", reason: "no_marker" });
  });

  it("ok:false 는 미달", () => {
    const res = summarizeCronContinuity({ at: "2026-10-16T08:10:00.000Z", ok: false }, NOW);
    expect(res).toMatchObject({ status: "fail", reason: "not_ok" });
  });

  it("주말은 영업일에서 빠진다 — 금요일 실행은 월요일 기준 1영업일", () => {
    const res = summarizeCronContinuity({ at: "2026-10-16T08:10:00.000Z", ok: true }, NOW);
    expect(res).toMatchObject({ status: "pass", businessDaysAgo: 1 });
  });

  it("3영업일 경계 — 3 통과, 4 미달", () => {
    // 10-14(수) → 10-19(월) = 목·금·월 3영업일.
    expect(
      summarizeCronContinuity({ at: "2026-10-14T08:10:00.000Z", ok: true }, NOW),
    ).toMatchObject({ status: "pass", businessDaysAgo: 3 });
    expect(
      summarizeCronContinuity({ at: "2026-10-13T08:10:00.000Z", ok: true }, NOW),
    ).toMatchObject({ status: "fail", reason: "stale", businessDaysAgo: 4 });
  });

  it("KST 날짜로 센다 — UTC 15시 이후 실행은 다음 KST 날짜", () => {
    // 2026-10-15T15:30Z = 10-16(금) 00:30 KST → 월요일 기준 1영업일.
    const res = summarizeCronContinuity({ at: "2026-10-15T15:30:00.000Z", ok: true }, NOW);
    expect(res.businessDaysAgo).toBe(1);
  });
});

describe("summarizeBadgeCoverage", () => {
  const scored = row({ runId: "run-a", w2Status: "hit" });

  it("카드 조회 실패면 확인 불가, 대상 0 이면 보류", () => {
    expect(summarizeBadgeCoverage(null, [], NOW).status).toBe("unknown");
    expect(summarizeBadgeCoverage([], [], NOW).status).toBe("pending");
  });

  it("16일 성숙 전 카드·US 카드는 제외", () => {
    const res = summarizeBadgeCoverage(
      [
        { ticker: "005930", updatedAt: "2026-10-03T01:00:00.000Z", runId: "run-a" }, // 정확히 16일 → 포함
        { ticker: "005930", updatedAt: "2026-10-04T01:00:00.000Z", runId: "run-a" }, // 15일
        { ticker: "AAPL", updatedAt: "2026-09-01T00:00:00.000Z", runId: null },
      ],
      [scored],
      NOW,
    );
    expect(res).toMatchObject({ status: "pass", n: 1, count: 1 });
  });

  it("같은 ticker 후보 안에서만 매칭 — 다른 종목 원장은 배지로 붙지 않는다", () => {
    const res = summarizeBadgeCoverage(
      [{ ticker: "000660", updatedAt: "2026-10-10T06:00:00.000Z", runId: null }],
      [row({ w2Status: "hit" })], // 005930, 같은 시각
      new Date("2026-10-30T00:00:00.000Z"),
    );
    expect(res).toMatchObject({ status: "fail", n: 1, count: 0 });
  });

  it("95% 경계 — 19/20 통과", () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      ticker: "005930",
      updatedAt: "2026-09-01T00:00:00.000Z",
      runId: i < 19 ? "run-a" : "run-missing",
    }));
    // run-missing 은 시각 폴백도 창 밖(decidedAt 10-10) → 배지 없음.
    expect(summarizeBadgeCoverage(cards, [scored], NOW)).toMatchObject({
      status: "pass",
      count: 19,
      rate: 0.95,
    });
  });
});
