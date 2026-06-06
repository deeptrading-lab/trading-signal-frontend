import { describe, it, expect } from "vitest";
import {
  calcSMA,
  calcBollinger,
  calcVolumeMA,
  calcADX,
  crossover,
  crossunder,
} from "@/lib/utils/technicalIndicators";
import { makeCandles, linearCloses } from "./_fixtures";

describe("calcSMA", () => {
  it("룩백 전 구간은 null, 이후는 단순평균", () => {
    const sma = calcSMA([1, 2, 3, 4, 5], 3);
    expect(sma[0]).toBeNull();
    expect(sma[1]).toBeNull();
    expect(sma[2]).toBe(2); // (1+2+3)/3
    expect(sma[3]).toBe(3);
    expect(sma[4]).toBe(4);
  });

  it("period 보다 짧으면 전부 null", () => {
    expect(calcSMA([1, 2], 5).every((v) => v === null)).toBe(true);
  });
});

describe("calcBollinger", () => {
  it("일정값 시리즈는 밴드폭 0, %B 분모 0 → null", () => {
    const b = calcBollinger(new Array(25).fill(100), 20, 2);
    const last = b[b.length - 1];
    expect(last.mid).toBe(100);
    expect(last.upper).toBe(100);
    expect(last.lower).toBe(100);
    expect(last.pctB).toBeNull(); // span 0
  });

  it("상승 시리즈 마지막 봉은 %B 가 0.5 초과(상단부)", () => {
    const b = calcBollinger(linearCloses(100, 1, 40), 20, 2);
    const last = b[b.length - 1];
    expect(last.pctB).not.toBeNull();
    expect(last.pctB as number).toBeGreaterThan(0.5);
  });
});

describe("calcVolumeMA", () => {
  it("calcSMA 위임 — 평균 일치", () => {
    expect(calcVolumeMA([10, 20, 30], 3)[2]).toBe(20);
  });
});

describe("calcADX", () => {
  it("강한 추세에서 ADX 가 약세 경계(20)보다 높다", () => {
    const candles = makeCandles(linearCloses(100, 2, 80));
    const adx = calcADX(candles, 14);
    const last = adx[adx.length - 1];
    expect(last.adx).not.toBeNull();
    expect(last.adx as number).toBeGreaterThan(20);
    // 상승 추세 → +DI > -DI
    expect((last.plusDI as number) > (last.minusDI as number)).toBe(true);
  });

  it("데이터 부족(<=period) 이면 전부 null", () => {
    const adx = calcADX(makeCandles([1, 2, 3]), 14);
    expect(adx.every((p) => p.adx === null)).toBe(true);
  });
});

describe("crossover / crossunder", () => {
  const a = [1, 1, 3]; // 마지막에 b 위로
  const b = [2, 2, 2];
  it("crossover — 직전 a<=b, 현재 a>b", () => {
    expect(crossover(a, b, 2)).toBe(true);
    expect(crossover(a, b, 1)).toBe(false);
  });
  it("crossunder — 반대 방향", () => {
    expect(crossunder([3, 3, 1], b, 2)).toBe(true);
  });
  it("null 구간은 교차 아님", () => {
    expect(crossover([null, 3], [2, 2], 1)).toBe(false);
  });
});
