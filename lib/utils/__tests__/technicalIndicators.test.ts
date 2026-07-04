import { describe, it, expect } from "vitest";
import { calcSMA, calcVWAP } from "@/lib/utils/technicalIndicators";

describe("calcSMA — 이동평균선(MA) 계산", () => {
  it("룩백 전 구간은 null, 이후 단순평균", () => {
    // period 3, 값 [1,2,3,4,5] → [null, null, 2, 3, 4]
    expect(calcSMA([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("데이터가 기간보다 짧으면 전부 null (MA120 워밍업 전 거동)", () => {
    expect(calcSMA([100, 101, 102], 5)).toEqual([null, null, null]);
  });

  it("MA5 — 슬라이딩 윈도우 평균", () => {
    const out = calcSMA([10, 20, 30, 40, 50, 60], 5);
    expect(out[0]).toBeNull();
    expect(out[3]).toBeNull();
    expect(out[4]).toBe(30); // (10+20+30+40+50)/5
    expect(out[5]).toBe(40); // (20+30+40+50+60)/5
  });
});

describe("calcVWAP — 거래량 가중 평균가", () => {
  it("빈 입력은 빈 배열", () => {
    expect(calcVWAP([])).toEqual([]);
  });

  it("단일 봉은 대표가(HLC/3) 자체", () => {
    // typical = (10+8+9)/3 = 9
    expect(calcVWAP([{ high: 10, low: 8, close: 9, volume: 100 }])).toEqual([9]);
  });

  it("누적 Σ(대표가×거래량)/Σ거래량", () => {
    const out = calcVWAP([
      { high: 10, low: 8, close: 9, volume: 100 }, // typical 9
      { high: 12, low: 10, close: 11, volume: 200 }, // typical 11
    ]);
    expect(out[0]).toBe(9);
    // (9*100 + 11*200) / 300 = 3100/300
    expect(out[1]).toBeCloseTo(3100 / 300, 10);
  });

  it("거래량 0 선행 구간은 분모 0이라 null, 거래량이 생기면 값 시작", () => {
    const out = calcVWAP([
      { high: 10, low: 8, close: 9, volume: 0 },
      { high: 12, low: 10, close: 11, volume: 200 }, // typical 11
    ]);
    expect(out[0]).toBeNull();
    expect(out[1]).toBe(11); // (0 + 11*200)/200
  });
});
