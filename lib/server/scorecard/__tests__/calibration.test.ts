/**
 * 자가교정 피드백(scorecard-feedback) 단위 테스트.
 *
 * - (가) calibrateConfidence / calibrateAllConfidences — 버킷 적중률·표본수·min-n 게이트 경계.
 * - (나) buildScorecardFeedbackSummary — n>=MIN_SAMPLE_N 버킷만 포함·빈 데이터 시 빈 문자열.
 *   (플래그 OFF 시 호출부가 빌더를 아예 부르지 않아 프롬프트 불변임은 route 통합 영역 — 여기선
 *    "빈 문자열 = 주입 skip" 계약을 고정한다.)
 *
 * fixture 는 summarizeScorecard 가 만드는 형태(ScorecardSummaryCell)를 직접 시드한다.
 */

import { describe, it, expect } from "vitest";
import {
  calibrateConfidence,
  calibrateAllConfidences,
  buildScorecardFeedbackSummary,
} from "@/lib/server/scorecard/calibration";
import { MIN_SAMPLE_N } from "@/lib/server/scorecard/constants";
import type {
  ScorecardConfidence,
  ScorecardHorizon,
  ScorecardSummaryCell,
} from "@/lib/types/scorecard/scorecard";

/** confidence 차원 셀 1개. hitRate 는 산출 결과라 미사용(0 placeholder). */
function confCell(
  key: ScorecardConfidence,
  horizon: ScorecardHorizon,
  hit: number,
  miss: number,
  flat = 0,
): ScorecardSummaryCell {
  const denom = hit + miss;
  return {
    dimension: "confidence",
    key,
    horizon,
    hit,
    miss,
    flat,
    total: hit + miss + flat,
    hitRate: denom > 0 ? hit / denom : null,
    absHitRate: denom > 0 ? hit / denom : null,
    absSample: denom,
  };
}

function verdictCell(
  key: string,
  horizon: ScorecardHorizon,
  hit: number,
  miss: number,
): ScorecardSummaryCell {
  const denom = hit + miss;
  return {
    dimension: "verdict",
    key,
    horizon,
    hit,
    miss,
    flat: 0,
    total: hit + miss,
    hitRate: denom > 0 ? hit / denom : null,
    absHitRate: denom > 0 ? hit / denom : null,
    absSample: denom,
  };
}

describe("calibrateConfidence — (가) 버킷 적중률·표본수", () => {
  it("전 horizon 합산 → hit/(hit+miss), 표본수 = hit+miss", () => {
    const cells = [
      confCell("HIGH", "d1", 6, 2),
      confCell("HIGH", "w1", 3, 1),
      confCell("HIGH", "m1", 2, 1, 5), // flat 은 분모 제외
    ];
    const cal = calibrateConfidence(cells, "HIGH", 5);
    expect(cal.hit).toBe(11);
    expect(cal.miss).toBe(4);
    expect(cal.sample).toBe(15);
    expect(cal.hitRate).toBeCloseTo(11 / 15, 6);
    expect(cal.sufficient).toBe(true); // 15 >= 5
  });

  it("표본 0(셀 없음) → hitRate null, sufficient false", () => {
    const cal = calibrateConfidence([], "LOW", 5);
    expect(cal.sample).toBe(0);
    expect(cal.hitRate).toBeNull();
    expect(cal.sufficient).toBe(false);
  });

  it("min-n 경계 — sample == minSampleN 이면 sufficient true(>=)", () => {
    const cells = [confCell("MEDIUM", "d1", 6, 4)]; // sample 10
    expect(calibrateConfidence(cells, "MEDIUM", 10).sufficient).toBe(true);
    expect(calibrateConfidence(cells, "MEDIUM", 11).sufficient).toBe(false); // 10 < 11
  });

  it("다른 confidence·다른 차원 셀은 합산에 섞이지 않는다", () => {
    const cells = [
      confCell("HIGH", "d1", 5, 0),
      confCell("LOW", "d1", 0, 5),
      verdictCell("BUY", "d1", 9, 9), // verdict 차원 — confidence 합산 제외
    ];
    const high = calibrateConfidence(cells, "HIGH", 5);
    expect(high.hit).toBe(5);
    expect(high.miss).toBe(0);
    expect(high.sample).toBe(5);
  });
});

describe("calibrateAllConfidences — 표본 1건 이상 버킷만", () => {
  it("표본 0 버킷은 제외, 표본 있는 버킷만 표시 순서로", () => {
    const cells = [
      confCell("HIGH", "d1", 3, 1), // sample 4
      confCell("LOW", "d1", 0, 0, 2), // 전부 flat → sample 0 → 제외
    ];
    const all = calibrateAllConfidences(cells, 5);
    expect(all.map((c) => c.confidence)).toEqual(["HIGH"]);
    expect(all[0].sufficient).toBe(false); // 4 < 5
  });

  it("빈 입력 → 빈 배열", () => {
    expect(calibrateAllConfidences([], 5)).toEqual([]);
  });
});

describe("buildScorecardFeedbackSummary — (나) 주입 문자열", () => {
  it("n>=minSampleN 버킷만 포함 — 미달 버킷은 라인 제외", () => {
    const cells = [
      confCell("HIGH", "d1", 18, 6), // sample 24 >= 20 → 포함
      confCell("LOW", "d1", 5, 5), // sample 10 < 20 → 제외
    ];
    const out = buildScorecardFeedbackSummary(cells, 20);
    expect(out).not.toBe("");
    expect(out).toContain("confidence 높음(HIGH)");
    expect(out).toContain("n=24");
    expect(out).not.toContain("(LOW)"); // 미달 버킷 미노출
    // 전체 라인 = 충분 버킷 합산(HIGH 만) → n=24
    expect(out).toContain("- 전체: 실측 적중률");
  });

  it("verdict 도 n>=minSampleN 만 포함(전 horizon 합산)", () => {
    const cells = [
      verdictCell("BUY", "d1", 14, 6), // 20
      verdictCell("BUY", "w1", 5, 5), // 합산 시 BUY = 19+11 = 30 -> n>=20
      verdictCell("SELL", "d1", 2, 3), // 5 < 20 → 제외
    ];
    const out = buildScorecardFeedbackSummary(cells, 20);
    expect(out).toContain("verdict BUY");
    expect(out).not.toContain("verdict SELL");
  });

  it("충분 표본 버킷이 하나도 없으면 빈 문자열(주입 skip)", () => {
    const cells = [
      confCell("HIGH", "d1", 5, 5), // 10 < 20
      verdictCell("BUY", "d1", 3, 2), // 5 < 20
    ];
    expect(buildScorecardFeedbackSummary(cells, 20)).toBe("");
  });

  it("빈 입력 → 빈 문자열", () => {
    expect(buildScorecardFeedbackSummary([], 20)).toBe("");
  });

  it("기본 인자(MIN_SAMPLE_N) 경계 — sample == MIN_SAMPLE_N 이면 포함", () => {
    const cells = [confCell("MEDIUM", "d1", MIN_SAMPLE_N, 0)];
    const out = buildScorecardFeedbackSummary(cells);
    expect(out).toContain("(MEDIUM)");
    expect(out).toContain(`n=${MIN_SAMPLE_N}`);
  });

  it("주입 문자열에 과신·앵커링 금지 가이드가 포함된다", () => {
    const cells = [confCell("HIGH", "d1", 20, 0)];
    const out = buildScorecardFeedbackSummary(cells, 20);
    expect(out).toContain("과신");
    expect(out).toContain("앵커링");
    expect(out).toContain("과거 판정 성적");
  });
});
