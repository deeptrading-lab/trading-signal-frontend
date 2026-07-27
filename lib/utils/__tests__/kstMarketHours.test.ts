import { describe, it, expect } from "vitest";
import {
  isKstMarketHours,
  isKstMarketHoursWithCloseGrace,
  isKstAfterMarketClose,
} from "@/lib/utils/kstMarketHours";

// KST = UTC+9. 2026-07-03 은 금요일, 2026-07-04 는 토요일.
const kst = (utcIso: string) => new Date(utcIso);

describe("isKstMarketHours (정규장 09:00~15:30)", () => {
  it("금 10:00 KST = 장중", () => {
    expect(isKstMarketHours(kst("2026-07-03T01:00:00Z"))).toBe(true);
  });
  it("금 15:35 KST = 장 마감 후(정규장 밖)", () => {
    expect(isKstMarketHours(kst("2026-07-03T06:35:00Z"))).toBe(false);
  });
  it("토요일은 항상 false", () => {
    expect(isKstMarketHours(kst("2026-07-04T01:00:00Z"))).toBe(false);
  });
});

describe("isKstAfterMarketClose (평일 15:40부터 — 세션 자동 완료 게이트)", () => {
  it("금 15:41 KST = 마감 후 → true", () => {
    expect(isKstAfterMarketClose(kst("2026-07-03T06:41:00Z"))).toBe(true);
  });
  it("금 21:00 KST(야간) = 마감 후 → true", () => {
    expect(isKstAfterMarketClose(kst("2026-07-03T12:00:00Z"))).toBe(true);
  });
  it("금 15:40 KST(마감 유예 종료) = 즉시 마감 후 → true", () => {
    expect(isKstAfterMarketClose(kst("2026-07-03T06:40:00Z"))).toBe(true);
  });
  it("금 10:00 KST(장중) → false", () => {
    expect(isKstAfterMarketClose(kst("2026-07-03T01:00:00Z"))).toBe(false);
  });
  it("금 08:00 KST(프리마켓) → false — 개장 전 미리 만든 세션을 완료시키지 않는다", () => {
    // 08:00 KST 금 = 23:00 UTC 목(2026-07-02).
    expect(isKstAfterMarketClose(kst("2026-07-02T23:00:00Z"))).toBe(false);
  });
  it("토요일 15:41 KST = 주말 → false", () => {
    expect(isKstAfterMarketClose(kst("2026-07-04T06:41:00Z"))).toBe(false);
  });
  // 마감 유예 게이트와의 경계 정합 — 15:39 까지 틱, 15:40 부터 종료.
  it("15:39 는 마감 유예 안(틱), 15:40 은 마감 후(종료) — 상호 배타", () => {
    const at1539 = kst("2026-07-03T06:39:00Z");
    const at1540 = kst("2026-07-03T06:40:00Z");
    expect(isKstMarketHoursWithCloseGrace(at1539)).toBe(true);
    expect(isKstAfterMarketClose(at1539)).toBe(false);
    expect(isKstMarketHoursWithCloseGrace(at1540)).toBe(false);
    expect(isKstAfterMarketClose(at1540)).toBe(true);
  });
});
