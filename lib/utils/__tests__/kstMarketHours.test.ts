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

describe("isKstAfterMarketClose (평일 15:40 초과 — 세션 자동 완료 게이트)", () => {
  it("금 15:41 KST = 마감 후 → true", () => {
    expect(isKstAfterMarketClose(kst("2026-07-03T06:41:00Z"))).toBe(true);
  });
  it("금 21:00 KST(야간) = 마감 후 → true", () => {
    expect(isKstAfterMarketClose(kst("2026-07-03T12:00:00Z"))).toBe(true);
  });
  it("금 15:40 KST(마감 유예 경계) = 아직 틱 구간 → false(겹침 방지)", () => {
    expect(isKstAfterMarketClose(kst("2026-07-03T06:40:00Z"))).toBe(false);
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
  // 마감 유예 게이트와의 경계 정합 — 15:40 은 틱(유예 안), 15:41 은 종료(마감 후).
  it("15:40 은 마감 유예 안(틱), 15:41 은 마감 후(종료) — 상호 배타", () => {
    const at1540 = kst("2026-07-03T06:40:00Z");
    const at1541 = kst("2026-07-03T06:41:00Z");
    expect(isKstMarketHoursWithCloseGrace(at1540)).toBe(true);
    expect(isKstAfterMarketClose(at1540)).toBe(false);
    expect(isKstMarketHoursWithCloseGrace(at1541)).toBe(false);
    expect(isKstAfterMarketClose(at1541)).toBe(true);
  });
});
