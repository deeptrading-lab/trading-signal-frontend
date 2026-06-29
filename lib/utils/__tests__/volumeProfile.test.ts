/**
 * `lib/utils/volumeProfile.ts` `computeVolumeProfile` 단위테스트.
 *
 * 매물대(가격대별 거래량) 집계 회귀 차단 — 가격대 분배·POC·평탄/빈/단일봉 에지.
 */

import { describe, it, expect } from "vitest";
import { computeVolumeProfile } from "../volumeProfile";

describe("computeVolumeProfile", () => {
  it("빈 입력 → 빈 프로파일", () => {
    const p = computeVolumeProfile([], 10);
    expect(p.bins).toHaveLength(0);
    expect(p.maxVolume).toBe(0);
    expect(p.pocIndex).toBe(-1);
  });

  it("거래량 합계 보존 — 각 봉 거래량이 버킷에 모두 분배된다", () => {
    const candles = [
      { low: 100, high: 110, volume: 1000 },
      { low: 105, high: 115, volume: 2000 },
      { low: 100, high: 120, volume: 500 },
    ];
    const p = computeVolumeProfile(candles, 4);
    const totalInput = 3500;
    const totalBinned = p.bins.reduce((s, b) => s + b.volume, 0);
    expect(totalBinned).toBeCloseTo(totalInput, 5);
  });

  it("버킷 경계가 가격 범위를 균등 분할한다", () => {
    const p = computeVolumeProfile(
      [{ low: 0, high: 100, volume: 100 }],
      4,
    );
    expect(p.bins).toHaveLength(4);
    expect(p.bins[0].low).toBeCloseTo(0);
    expect(p.bins[0].high).toBeCloseTo(25);
    expect(p.bins[3].high).toBeCloseTo(100);
    expect(p.bins[0].mid).toBeCloseTo(12.5);
  });

  it("POC — 가장 거래량이 몰린 가격대 버킷을 가리킨다", () => {
    // 100~104 가격대에 거래량 집중, 나머지는 얕게.
    const candles = [
      { low: 100, high: 104, volume: 10000 },
      { low: 100, high: 140, volume: 400 },
    ];
    const p = computeVolumeProfile(candles, 10);
    expect(p.pocIndex).toBe(0); // 최저 가격대 버킷
    expect(p.bins[p.pocIndex].volume).toBe(p.maxVolume);
    // 모든 버킷이 maxVolume 이하
    for (const b of p.bins) expect(b.volume).toBeLessThanOrEqual(p.maxVolume);
  });

  it("평탄(가격 폭 0) → 단일 버킷에 전체 거래량", () => {
    const candles = [
      { low: 50, high: 50, volume: 300 },
      { low: 50, high: 50, volume: 700 },
    ];
    const p = computeVolumeProfile(candles, 8);
    expect(p.bins).toHaveLength(1);
    expect(p.maxVolume).toBe(1000);
    expect(p.pocIndex).toBe(0);
  });

  it("거래량이 전부 0 → 빈 프로파일", () => {
    const p = computeVolumeProfile(
      [{ low: 100, high: 110, volume: 0 }],
      5,
    );
    expect(p.bins).toHaveLength(0);
    expect(p.maxVolume).toBe(0);
  });

  it("최고가(priceMax)가 마지막 버킷에 들어간다(인덱스 오버플로 클램프)", () => {
    const p = computeVolumeProfile(
      [{ low: 0, high: 100, volume: 100 }],
      10,
    );
    // 단일 봉이 전 범위를 걸치므로 10개 버킷에 10씩 균등.
    expect(p.bins).toHaveLength(10);
    for (const b of p.bins) expect(b.volume).toBeCloseTo(10, 5);
  });
});
