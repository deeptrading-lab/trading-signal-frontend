/**
 * `lib/market/regime.ts` `computeIndexRegime` 단위테스트.
 *
 * PRD `market-snapshot` AC-4 — 추세 분류·이평 상회·기울기·모멘텀·degrade 회귀 차단.
 */

import { describe, it, expect } from "vitest";
import { computeIndexRegime } from "../regime";

/** 길이 n 의 선형 시계열(start 에서 step 씩). */
function linear(n: number, start: number, step: number): number[] {
  return Array.from({ length: n }, (_, i) => start + i * step);
}

describe("computeIndexRegime", () => {
  it("꾸준한 상승 → uptrend, 이평 전부 상회, 120선 우상향, 모멘텀 양수, 리스크 low", () => {
    const r = computeIndexRegime(linear(150, 100, 1));
    expect(r.trend).toBe("uptrend");
    expect(r.aboveMA).toEqual({ ma20: true, ma60: true, ma120: true });
    expect(r.maSlope120).toBe("up");
    expect(r.momentum.d5!).toBeGreaterThan(0);
    expect(r.momentum.d20!).toBeGreaterThan(0);
    expect(r.riskLevel).toBe("low");
    expect(r.bars).toBe(150);
  });

  it("꾸준한 하락 → downtrend, 이평 전부 하회, 120선 우하향, 리스크 high", () => {
    const r = computeIndexRegime(linear(150, 300, -1));
    expect(r.trend).toBe("downtrend");
    expect(r.aboveMA).toEqual({ ma20: false, ma60: false, ma120: false });
    expect(r.maSlope120).toBe("down");
    expect(r.riskLevel).toBe("high");
  });

  it("장기 상승 + 단기 조정 → pullback, ma20 하회·ma120 상회, 리스크 elevated", () => {
    const closes = [...linear(145, 100, 1), 232, 232, 232, 232, 232, 232];
    const r = computeIndexRegime(closes);
    expect(r.trend).toBe("pullback");
    expect(r.aboveMA.ma20).toBe(false);
    expect(r.aboveMA.ma120).toBe(true);
    expect(r.maSlope120).toBe("up");
    expect(r.riskLevel).toBe("elevated");
  });

  it("봉 부족 → 장기 지표 null degrade, neutral, 전체는 정상 반환", () => {
    const r = computeIndexRegime(linear(10, 100, 1));
    expect(r.trend).toBe("neutral");
    expect(r.aboveMA.ma60).toBeNull();
    expect(r.aboveMA.ma120).toBeNull();
    expect(r.maSlope120).toBeNull();
    expect(r.momentum.d20).toBeNull();
    expect(r.momentum.d5).not.toBeNull(); // 10>5 → 계산됨
    expect(r.bars).toBe(10);
  });

  it("빈 배열 → 안전 degrade(neutral, bars 0)", () => {
    const r = computeIndexRegime([]);
    expect(r.trend).toBe("neutral");
    expect(r.bars).toBe(0);
    expect(r.momentum.d5).toBeNull();
  });

  it("breadthPct 낮으면 상승추세라도 리스크 elevated 로 보정", () => {
    const r = computeIndexRegime(linear(150, 100, 1), { breadthPct: 30 });
    expect(r.trend).toBe("uptrend");
    expect(r.riskLevel).toBe("elevated");
  });
});
