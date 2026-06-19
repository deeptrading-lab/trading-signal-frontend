/**
 * 적중 판정 순수 로직 단위 테스트 — PRD `signal-scorecard` AC-4.
 *
 * verdict별 hit/miss/flat 경계값(r=+T, r=−T, |r|=T)을 전수 검증한다. T=2(기본).
 */

import { describe, it, expect } from "vitest";
import { scoreOutcome, computeReturnPct } from "@/lib/server/scorecard/scoring";

const T = 2;

describe("computeReturnPct", () => {
  it("entry 100 → close 103 = +3%", () => {
    expect(computeReturnPct(100, 103)).toBeCloseTo(3, 6);
  });
  it("entry 100 → close 98 = -2%", () => {
    expect(computeReturnPct(100, 98)).toBeCloseTo(-2, 6);
  });
  it("entry ≤ 0 또는 비정상 → null", () => {
    expect(computeReturnPct(0, 100)).toBeNull();
    expect(computeReturnPct(-10, 100)).toBeNull();
    expect(computeReturnPct(100, Number.NaN)).toBeNull();
  });
});

describe("scoreOutcome — BUY · OVERWEIGHT (강세군)", () => {
  for (const verdict of ["BUY", "OVERWEIGHT"] as const) {
    it(`${verdict}: r=+T(${T}) → hit (경계 포함)`, () => {
      expect(scoreOutcome(verdict, T, T)).toBe("hit");
    });
    it(`${verdict}: r=+3 → hit`, () => {
      expect(scoreOutcome(verdict, 3, T)).toBe("hit");
    });
    it(`${verdict}: r=-T(${-T}) → miss (경계 포함)`, () => {
      expect(scoreOutcome(verdict, -T, T)).toBe("miss");
    });
    it(`${verdict}: r=-3 → miss`, () => {
      expect(scoreOutcome(verdict, -3, T)).toBe("miss");
    });
    it(`${verdict}: r=0 (밴드 내) → flat`, () => {
      expect(scoreOutcome(verdict, 0, T)).toBe("flat");
    });
    it(`${verdict}: r=+1.99 (밴드 내) → flat`, () => {
      expect(scoreOutcome(verdict, 1.99, T)).toBe("flat");
    });
  }
});

describe("scoreOutcome — SELL · REDUCE (약세군, 부호 반대)", () => {
  for (const verdict of ["SELL", "REDUCE"] as const) {
    it(`${verdict}: r=-T(${-T}) → hit (경계 포함)`, () => {
      expect(scoreOutcome(verdict, -T, T)).toBe("hit");
    });
    it(`${verdict}: r=-5 → hit`, () => {
      expect(scoreOutcome(verdict, -5, T)).toBe("hit");
    });
    it(`${verdict}: r=+T(${T}) → miss (경계 포함)`, () => {
      expect(scoreOutcome(verdict, T, T)).toBe("miss");
    });
    it(`${verdict}: r=+5 → miss`, () => {
      expect(scoreOutcome(verdict, 5, T)).toBe("miss");
    });
    it(`${verdict}: r=-1 (밴드 내) → flat`, () => {
      expect(scoreOutcome(verdict, -1, T)).toBe("flat");
    });
  }
});

describe("scoreOutcome — HOLD (중립, flat 없음)", () => {
  it("|r|=T → hit (밴드 경계 포함)", () => {
    expect(scoreOutcome("HOLD", T, T)).toBe("hit");
    expect(scoreOutcome("HOLD", -T, T)).toBe("hit");
  });
  it("r=0 → hit (밴드 정중앙)", () => {
    expect(scoreOutcome("HOLD", 0, T)).toBe("hit");
  });
  it("|r|>T → miss", () => {
    expect(scoreOutcome("HOLD", T + 0.01, T)).toBe("miss");
    expect(scoreOutcome("HOLD", -(T + 0.01), T)).toBe("miss");
    expect(scoreOutcome("HOLD", 10, T)).toBe("miss");
  });
});

describe("scoreOutcome — UNDERWEIGHT (약한 약세)", () => {
  it("r≤0 → hit", () => {
    expect(scoreOutcome("UNDERWEIGHT", 0, T)).toBe("hit");
    expect(scoreOutcome("UNDERWEIGHT", -3, T)).toBe("hit");
  });
  it("r>+T → miss", () => {
    expect(scoreOutcome("UNDERWEIGHT", T + 0.01, T)).toBe("miss");
    expect(scoreOutcome("UNDERWEIGHT", 5, T)).toBe("miss");
  });
  it("0<r≤T (소폭 상승) → flat", () => {
    expect(scoreOutcome("UNDERWEIGHT", 1, T)).toBe("flat");
    expect(scoreOutcome("UNDERWEIGHT", T, T)).toBe("flat");
  });
});

describe("scoreOutcome — 기본 임계 T=2 (HIT_THRESHOLD_PCT)", () => {
  it("threshold 인자 생략 시 기본 2% 적용", () => {
    expect(scoreOutcome("BUY", 2)).toBe("hit");
    expect(scoreOutcome("BUY", 1.9)).toBe("flat");
    expect(scoreOutcome("BUY", -2)).toBe("miss");
  });
});
