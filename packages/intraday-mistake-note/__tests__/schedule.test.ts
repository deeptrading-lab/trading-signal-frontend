import { describe, expect, it } from "vitest";
import { defaultReviewDate, shouldSkipRemoteReview } from "../src/schedule";

describe("defaultReviewDate", () => {
  it("장 마감 리뷰 시각 이후에는 당일 원장을 선택한다", () => {
    expect(defaultReviewDate(new Date("2026-07-30T07:30:00.000Z"))).toBe("2026-07-30");
  });

  it("장 마감 리뷰 시각 전에는 전일 원장을 선택한다", () => {
    expect(defaultReviewDate(new Date("2026-07-30T07:29:59.000Z"))).toBe("2026-07-29");
  });

  it("KST 월초 경계에서도 전일을 계산한다", () => {
    expect(defaultReviewDate(new Date("2026-07-01T00:00:00.000Z"))).toBe("2026-06-30");
  });
});

describe("shouldSkipRemoteReview", () => {
  const manifest = {
    day: "2026-07-30",
    lastSuccessfulDate: "2026-07-30",
    lastInputHash: "abc123",
  };

  it("같은 날짜 성공 manifest는 원격 수집 전에 종료한다", () => {
    expect(
      shouldSkipRemoteReview({ ...manifest, dryRun: false, forceRefresh: false }),
    ).toBe(true);
  });

  it("dry/force-refresh/다른 날짜는 원격 수집을 허용한다", () => {
    expect(shouldSkipRemoteReview({ ...manifest, dryRun: true, forceRefresh: false })).toBe(false);
    expect(shouldSkipRemoteReview({ ...manifest, dryRun: false, forceRefresh: true })).toBe(false);
    expect(
      shouldSkipRemoteReview({
        ...manifest,
        day: "2026-07-31",
        dryRun: false,
        forceRefresh: false,
      }),
    ).toBe(false);
  });
});
