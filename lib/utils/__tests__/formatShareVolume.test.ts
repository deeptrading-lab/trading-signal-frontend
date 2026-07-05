/**
 * 거래량 컴팩트 포맷터 — 억/만/주 경계·fail-soft 단위 테스트(⑤ 값 컬럼).
 */

import { describe, it, expect } from "vitest";
import { formatShareVolume } from "@/lib/utils/formatShareVolume";

describe("formatShareVolume", () => {
  it("1억주 이상은 억 단위(10억 미만 소수 1자리)", () => {
    expect(formatShareVolume(253_000_000)).toBe("2.5억주");
    expect(formatShareVolume(1_200_000_000)).toBe("12억주"); // 10억↑ 정수
  });

  it("1만주~1억주 미만은 만 단위 정수 콤마", () => {
    expect(formatShareVolume(12_340_000)).toBe("1,234만주");
    expect(formatShareVolume(35_000)).toBe("3만주");
  });

  it("1만주 미만은 주 단위 콤마", () => {
    expect(formatShareVolume(8_500)).toBe("8,500주");
  });

  it("미확보·0·음수·NaN 은 '-'", () => {
    expect(formatShareVolume(null)).toBe("-");
    expect(formatShareVolume(undefined)).toBe("-");
    expect(formatShareVolume(0)).toBe("-");
    expect(formatShareVolume(-1)).toBe("-");
    expect(formatShareVolume(NaN)).toBe("-");
  });
});
