import { describe, it, expect } from "vitest";
import { calcVolumeProfile, findHVNs } from "../volumeProfile";
import { makeCandles } from "@/lib/signal/__tests__/_fixtures";

describe("calcVolumeProfile", () => {
  it("빈 입력 → 빈 배열", () => {
    expect(calcVolumeProfile([], 40)).toHaveLength(0);
  });

  it("모든 봉이 동일 가격 → 단일 노드 반환", () => {
    const candles = makeCandles(Array(10).fill(100), { wick: 0 });
    const profile = calcVolumeProfile(candles, 40);
    expect(profile.length).toBe(1);
    expect(profile[0].price).toBeCloseTo(100);
    expect(profile[0].pct).toBeCloseTo(1);
  });

  it("bins 개수만큼 노드 반환(가격 범위 있을 때)", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i);
    const profile = calcVolumeProfile(makeCandles(closes), 20);
    expect(profile).toHaveLength(20);
  });

  it("모든 pct 합 ≈ 1", () => {
    const closes = [90, 95, 100, 105, 110, 100, 95, 90];
    const profile = calcVolumeProfile(makeCandles(closes), 10);
    const total = profile.reduce((s, n) => s + n.pct, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("거래량 집중 구간의 pct 가 분산 구간보다 높음", () => {
    // 50봉: 100에서 집중 거래(volume 5000) / 나머지는 150 근처(volume 500)
    const vols = Array(60).fill(500);
    for (let i = 20; i < 30; i++) vols[i] = 5000; // 100~110 구간에 집중
    const closes = Array.from({ length: 60 }, (_, i) => (i < 30 ? 100 + i % 10 : 150 + i % 5));
    const profile = calcVolumeProfile(makeCandles(closes, { volumes: vols }), 20);
    const maxNode = profile.reduce((a, b) => (a.pct > b.pct ? a : b));
    expect(maxNode.pct).toBeGreaterThan(profile.reduce((s, n) => s + n.pct, 0) / profile.length);
  });
});

describe("findHVNs", () => {
  it("균일 분포 → 피크 없음(minPct 조건 미충족)", () => {
    const profile = Array.from({ length: 10 }, (_, i) => ({
      price: 100 + i,
      volume: 1000,
      pct: 0.1, // 10% 각각, minPct=0.02 이상이지만 로컬 최대값 아님
    }));
    expect(findHVNs(profile)).toHaveLength(0); // 모두 동일 → 로컬 최대 없음
  });

  it("명확한 단일 피크 → 해당 노드 반환", () => {
    // 모든 양옆보다 작게 설정해 피크가 정확히 1개만 나오도록.
    const profile = [
      { price: 100, volume: 500, pct: 0.05 },
      { price: 105, volume: 3000, pct: 0.30 }, // 피크
      { price: 110, volume: 200, pct: 0.02 },
      { price: 115, volume: 100, pct: 0.01 },
      { price: 120, volume: 200, pct: 0.02 },
    ];
    const hvns = findHVNs(profile, 0.02);
    expect(hvns).toHaveLength(1);
    expect(hvns[0].price).toBe(105);
  });

  it("minPct 미만 피크는 제외", () => {
    const profile = [
      { price: 100, volume: 100, pct: 0.005 }, // minPct 미만
      { price: 105, volume: 200, pct: 0.010 }, // 피크지만 minPct 미만
      { price: 110, volume: 100, pct: 0.005 },
    ];
    expect(findHVNs(profile, 0.02)).toHaveLength(0);
  });
});
