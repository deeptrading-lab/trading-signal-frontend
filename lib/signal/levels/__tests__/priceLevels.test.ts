/**
 * priceLevels 회귀 — 매물대 위/아래 분류(지지·저항 판단의 근간)와 레벨 계산을 고정한다.
 *
 * 배경: 종합분석에 레벨 **실측값**이 없어 모델이 "233,000원(20일선)" 처럼 추정 라벨을 붙이던 문제
 * (실제 20일선 276,350원). 이 모듈이 그 값을 공급한다.
 */

import { describe, it, expect } from "vitest";
import { computePriceLevels } from "@/lib/signal/levels/priceLevels";
import { formatPriceLevelsForPrompt } from "@/lib/signal/levels/formatPriceLevels";
import type { StockDailyCandle } from "@/lib/api/kis/types";

/** 지정 종가 배열 → 일봉(고저는 종가 ±0.5%, 거래량 균일). 날짜는 순증(정렬 안정). */
function dateAt(i: number): string {
  const d = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function series(closes: number[], volumes?: number[]): StockDailyCandle[] {
  return closes.map((c, i) => ({
    date: dateAt(i),
    open: c,
    high: c * 1.005,
    low: c * 0.995,
    close: c,
    volume: volumes?.[i] ?? 1000,
  }));
}

describe("computePriceLevels — 이동평균·볼린저", () => {
  it("이동평균은 실제 종가 평균(반올림)", () => {
    const closes = Array.from({ length: 130 }, (_, i) => 100 + i); // 100..229
    const lv = computePriceLevels(series(closes), 229);
    expect(lv.ma.ma5).toBe(Math.round((225 + 226 + 227 + 228 + 229) / 5));
    expect(lv.ma.ma20).toBe(Math.round((210 + 229) / 2)); // 등차수열 평균
    expect(lv.ma.ma120).not.toBeNull();
  });

  it("봉이 부족한 기간은 null(추정 금지)", () => {
    const lv = computePriceLevels(series([100, 101, 102]), 102);
    expect(lv.ma.ma20).toBeNull();
    expect(lv.ma.ma120).toBeNull();
    expect(lv.bollinger).toBeNull();
  });

  it("볼린저는 상단>중심>하단", () => {
    const lv = computePriceLevels(series(Array.from({ length: 40 }, (_, i) => 100 + (i % 7))), 103);
    const b = lv.bollinger!;
    expect(b.upper).toBeGreaterThan(b.mid);
    expect(b.mid).toBeGreaterThan(b.lower);
  });
});

describe("computePriceLevels — 매물대 위/아래 분류(핵심)", () => {
  // 90~110 사이를 오가되 **95 근처에 거래량을 몰아** 두꺼운 매물대를 만든다.
  const closes = Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? 95 : 108));
  const volumes = closes.map((c) => (c === 95 ? 9000 : 500));

  it("현재가가 매물대 위면 그 매물대는 '아래(지지 후보)'로 분류", () => {
    const lv = computePriceLevels(series(closes, volumes), 108);
    expect(lv.nearestSupport).not.toBeNull();
    expect(lv.nearestSupport!.side).toBe("below");
    expect(lv.nearestSupport!.price).toBeLessThan(108);
    expect(lv.nearestSupport!.distPct).toBeLessThan(0); // 구간이 현재가 아래
  });

  it("현재가가 매물대 아래면 그 매물대는 '위(저항)'로 분류", () => {
    const lv = computePriceLevels(series(closes, volumes), 90);
    expect(lv.nearestResistance).not.toBeNull();
    expect(lv.nearestResistance!.side).toBe("above");
    expect(lv.nearestResistance!.distPct).toBeGreaterThan(0);
  });

  it("현재가가 매물대에 근접하면 'at'(지지 시도 구간)", () => {
    const lv = computePriceLevels(series(closes, volumes), 95);
    expect(lv.zones.some((z) => z.side === "at")).toBe(true);
  });

  it("비중이 작은 구간은 매물대로 치지 않는다(노이즈 컷)", () => {
    const lv = computePriceLevels(series(closes, volumes), 108);
    expect(lv.zones.every((z) => z.weightPct >= 3)).toBe(true);
  });
});

describe("computePriceLevels — 피보나치 되돌림", () => {
  it("저→고 파동에서 되돌림 레벨과 현재 되돌림 비율을 낸다", () => {
    // 100까지 내려갔다가 200으로 오른 뒤 현재 150 → 정확히 50% 되돌림.
    const closes = [...Array.from({ length: 60 }, () => 100), ...Array.from({ length: 60 }, (_, i) => 100 + i * 1.7)];
    const lv = computePriceLevels(series(closes), 150);
    const f = lv.fib!;
    expect(f.waveLow).toBeLessThan(f.waveHigh);
    const half = f.levels.find((l) => l.ratio === 0.5)!;
    expect(Math.abs(half.price - (f.waveHigh - (f.waveHigh - f.waveLow) * 0.5))).toBeLessThanOrEqual(1);
    expect(f.retracedRatio).toBeGreaterThan(0);
  });
});

describe("formatPriceLevelsForPrompt", () => {
  const closes = Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? 95 : 108));
  const volumes = closes.map((c) => (c === 95 ? 9000 : 500));

  it("실측값과 해석 규칙이 문구에 포함된다", () => {
    const lv = computePriceLevels(series(closes, volumes), 108);
    const text = formatPriceLevelsForPrompt(lv, 108);
    expect(text).toContain("가격 레벨 — 실측값(추정 금지)");
    expect(text).toContain("이동평균:");
    expect(text).toContain("볼린저(20,2)");
    expect(text).toContain("현재가 아래(지지 후보)");
    expect(text).toContain("추가 하락 여지");
  });

  it("데이터가 없으면 빈 문자열(프롬프트 무회귀)", () => {
    expect(formatPriceLevelsForPrompt(computePriceLevels([], 0), 0)).toBe("");
  });
});

describe("VolumeZone.distPct — 분모는 현재가(불가능한 -100% 이하 방지)", () => {
  it("현재가 대비 거리는 -100% 아래로 내려가지 않는다", () => {
    // 현재가가 매물대보다 훨씬 위(2배 이상)여도 -100% 를 넘지 않아야 한다.
    const closes = Array.from({ length: 200 }, (_, i) => (i < 150 ? 50 : 200));
    const volumes = closes.map((c) => (c === 50 ? 9000 : 500));
    const lv = computePriceLevels(series(closes, volumes), 200);
    for (const z of lv.zones) {
      expect(z.distPct).toBeGreaterThan(-100);
    }
    const support = lv.nearestSupport!;
    // 50 근처 매물대는 현재가 200 대비 약 -75%(표시가는 반올림이라 소수점 오차 허용).
    expect(support.distPct).toBeCloseTo(((support.price - 200) / 200) * 100, 0);
    expect(support.distPct).toBeLessThan(-70);
  });
});
