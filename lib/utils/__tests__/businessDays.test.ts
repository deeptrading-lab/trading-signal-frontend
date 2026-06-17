import { describe, it, expect } from "vitest";
import { businessDaysBetween } from "@/lib/utils/businessDays";

/** 로컬 자정 기준 Date 헬퍼(테스트 가독성). */
const d = (iso: string) => new Date(`${iso}T00:00:00`);

describe("businessDaysBetween", () => {
  it("같은 날이면 0", () => {
    expect(businessDaysBetween(d("2026-06-17"), d("2026-06-17"))).toBe(0);
  });

  it("from 이 to 보다 미래면 0", () => {
    expect(businessDaysBetween(d("2026-06-18"), d("2026-06-17"))).toBe(0);
  });

  it("금요일 → 다음 주 월요일 = 1영업일(주말 제외)", () => {
    // 2026-06-19(금) → 2026-06-22(월): 토·일 제외, 월요일만.
    expect(businessDaysBetween(d("2026-06-19"), d("2026-06-22"))).toBe(1);
  });

  it("월요일 → 같은 주 금요일 = 4영업일", () => {
    // 2026-06-15(월) → 2026-06-19(금): 화·수·목·금.
    expect(businessDaysBetween(d("2026-06-15"), d("2026-06-19"))).toBe(4);
  });

  it("금요일 → 다음 주 금요일 = 5영업일(주말 1쌍 제외)", () => {
    expect(businessDaysBetween(d("2026-06-12"), d("2026-06-19"))).toBe(5);
  });

  it("주말만 끼면 0영업일(금→일)", () => {
    expect(businessDaysBetween(d("2026-06-19"), d("2026-06-21"))).toBe(0);
  });

  it("3주 노후(콜드스타트)면 임계(7)를 초과", () => {
    // 2026-05-27(수) → 2026-06-17(수): 15영업일.
    expect(businessDaysBetween(d("2026-05-27"), d("2026-06-17"))).toBe(15);
  });
});
