import { describe, it, expect } from "vitest";
import { krxTickSize, roundToKrxTick } from "@/lib/utils/krxTick";

describe("krxTickSize", () => {
  it("가격대별 호가단위 (KRX 유가 2023 개편)", () => {
    expect(krxTickSize(1_500)).toBe(1);
    expect(krxTickSize(2_000)).toBe(5);
    expect(krxTickSize(4_999)).toBe(5);
    expect(krxTickSize(5_000)).toBe(10);
    expect(krxTickSize(19_999)).toBe(10);
    expect(krxTickSize(20_000)).toBe(50);
    expect(krxTickSize(49_999)).toBe(50);
    expect(krxTickSize(50_000)).toBe(100);
    expect(krxTickSize(199_999)).toBe(100);
    expect(krxTickSize(200_000)).toBe(500);
    expect(krxTickSize(499_999)).toBe(500);
    expect(krxTickSize(500_000)).toBe(1_000);
  });
});

describe("roundToKrxTick", () => {
  it("100원 구간 — 76,161 → 76,200", () => {
    expect(roundToKrxTick(76_161)).toBe(76_200);
  });

  it("이미 호가에 맞으면 그대로 — 72,000", () => {
    expect(roundToKrxTick(72_000)).toBe(72_000);
  });

  it("50원 구간 — 41,973 → 41,950", () => {
    expect(roundToKrxTick(41_973)).toBe(41_950);
  });

  it("10원 구간 — 6,547 → 6,550", () => {
    expect(roundToKrxTick(6_547)).toBe(6_550);
  });

  it("1,000원 구간 — 512,300 → 512,000", () => {
    expect(roundToKrxTick(512_300)).toBe(512_000);
  });

  it("비유한 입력은 그대로 반환", () => {
    expect(roundToKrxTick(Number.NaN)).toBeNaN();
  });
});
