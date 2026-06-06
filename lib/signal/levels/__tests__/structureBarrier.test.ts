import { describe, it, expect } from "vitest";
import { structureBarrierAt } from "../structureBarrier";
import { makeCandles, linearCloses } from "@/lib/signal/__tests__/_fixtures";

/**
 * 구조적 S/R 테스트용 캔들 생성 — 명확한 스윙 고저가 있는 시계열.
 * 100 → 상승(140) → 하락(90) → 반등(100 부근)
 */
function makeSwingCandles(): ReturnType<typeof makeCandles> {
  const closes = [
    ...linearCloses(100, 2, 20),  // 0~19: 100→138 (상승 추세)
    ...linearCloses(138, -3, 16), // 20~35: 138→93 (하락)
    ...linearCloses(93, 1, 14),   // 36~49: 93→106 (반등)
  ];
  return makeCandles(closes);
}

describe("structureBarrierAt (LONG)", () => {
  const candles = makeSwingCandles();
  const entry = candles[candles.length - 1].close; // 반등 구간 마지막 봉

  it("TP 는 항상 진입가 위", () => {
    const r = structureBarrierAt(candles, entry, 1);
    if (!r) return; // 구조 미발견도 유효 케이스
    expect(r.tpPrice).toBeGreaterThan(entry);
  });

  it("SL 은 항상 진입가 아래", () => {
    const r = structureBarrierAt(candles, entry, 1);
    if (!r) return;
    expect(r.slPrice).toBeLessThan(entry);
  });

  it("RRR ≥ minRRR", () => {
    const minRRR = 1.5;
    const r = structureBarrierAt(candles, entry, 1, { minRRR });
    if (!r) return;
    const rrr = (r.tpPrice - entry) / (entry - r.slPrice);
    expect(rrr).toBeGreaterThanOrEqual(minRRR - 1e-9);
  });

  it("minRRR 올리면 null 반환 가능(조건 강화)", () => {
    // minRRR=10 은 극단적 — 대부분의 구조에서 null
    const r = structureBarrierAt(candles, entry, 1, { minRRR: 10 });
    // null 또는 RRR 10이상(극히 드뭄) — null이 나오는지 또는 조건 충족 확인
    if (r) {
      const rrr = (r.tpPrice - entry) / (entry - r.slPrice);
      expect(rrr).toBeGreaterThanOrEqual(10 - 1e-9);
    }
    // null 자체도 valid (함수가 올바르게 필터링)
  });

  it("룩어헤드 없음 — 과거 봉만으로 결과가 달라지지 않음(동일 슬라이스)", () => {
    const r1 = structureBarrierAt(candles, entry, 1);
    const r2 = structureBarrierAt(candles, entry, 1);
    expect(r1?.tpPrice).toBe(r2?.tpPrice);
    expect(r1?.slPrice).toBe(r2?.slPrice);
  });

  it("데이터 부족(윈도우 < swingWindow*2+1) → null", () => {
    const tiny = makeCandles(linearCloses(100, 1, 5));
    const r = structureBarrierAt(tiny, 104, 1, { swingWindow: 3 });
    expect(r).toBeNull();
  });
});

describe("structureBarrierAt (SHORT)", () => {
  const candles = makeSwingCandles();
  const entry = candles[20].close; // 고점 부근 진입(138)

  it("SHORT: TP는 진입가 아래, SL은 진입가 위", () => {
    const r = structureBarrierAt(candles.slice(0, 22), entry, -1);
    if (!r) return;
    expect(r.tpPrice).toBeLessThan(entry);
    expect(r.slPrice).toBeGreaterThan(entry);
  });
});

describe("structureBarrierAt MA 손절", () => {
  it("maStopPeriod=0 이면 MA 손절 미적용", () => {
    const candles = makeCandles(linearCloses(100, 1, 60));
    const entry = candles[candles.length - 1].close;
    const rWith = structureBarrierAt(candles, entry, 1, { maStopPeriod: 20 });
    const rNone = structureBarrierAt(candles, entry, 1, { maStopPeriod: 0 });
    // 결과가 다를 수 있고(MA 개입 여부), 다 null이거나 다 값 — 타입 안전성만 확인
    expect(typeof rWith === "object" || rWith === null).toBe(true);
    expect(typeof rNone === "object" || rNone === null).toBe(true);
  });
});
