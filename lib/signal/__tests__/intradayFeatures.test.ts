import { describe, expect, it } from "vitest";
import {
  extractIntradayFeatures,
  formatIntradayFeatures,
} from "@/lib/signal/intradayFeatures";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

function bar(
  time: string,
  o: number,
  h: number,
  l: number,
  c: number,
  v = 1000,
): StockMinuteCandle {
  return { date: `2026-07-03T${time}`, open: o, high: h, low: l, close: c, volume: v };
}

/** 완만한 상승 후 눌림 시나리오 — 스윙 고점 형성 뒤 되돌림. */
function pullbackSeries(): StockMinuteCandle[] {
  const out: StockMinuteCandle[] = [];
  // 09:00~09:19 상승(100 → 119).
  for (let i = 0; i < 20; i++) {
    const base = 100 + i;
    out.push(bar(`09:${String(i).padStart(2, "0")}`, base, base + 1.4, base - 0.4, base + 1));
  }
  // 09:20~09:24 되돌림(-4).
  for (let i = 0; i < 5; i++) {
    const base = 120 - i;
    out.push(bar(`09:${String(20 + i).padStart(2, "0")}`, base, base + 0.4, base - 1.4, base - 1));
  }
  return out;
}

describe("extractIntradayFeatures", () => {
  it("봉 부족이면 null", () => {
    expect(extractIntradayFeatures([bar("09:00", 100, 101, 99, 100)], 1, 130)).toBeNull();
  });

  it("마감봉 꼬리 — 긴 아래꼬리를 저가 매수 흡수로 읽는다", () => {
    const candles = pullbackSeries();
    // 마지막 마감봉을 아래꼬리 봉으로 교체: range 10, 아래꼬리 7 (저가에서 말아올림).
    candles[candles.length - 2] = bar("09:23", 116, 117, 107, 116.5, 5000);
    const f = extractIntradayFeatures(candles, 1, 130);
    const lastClosed = f!.lastBars.at(-1)!;
    expect(lastClosed.lowerWickPct).toBeGreaterThan(60);
    expect(formatIntradayFeatures(f)).toContain("저가 매수 흡수");
  });

  it("스윙 구조 — 직전 저점 붕괴를 표시한다", () => {
    // V자(상승→눌림 바닥→재상승)로 확정 스윙 저점을 만든 뒤, 마지막 봉이 그 아래로 이탈.
    const path = [100, 102, 104, 106, 108, 110, 109, 107, 105, 107, 109, 111, 112, 113, 114];
    const candles = path.map((p, i) =>
      bar(`09:${String(i).padStart(2, "0")}`, p, p + 0.6, p - 0.6, p + 0.3),
    );
    candles.push(bar("09:15", 114, 114.5, 95, 96)); // 확정 저점(104.4) 붕괴.
    const f = extractIntradayFeatures(candles, 1, 130);
    expect(f!.swing.lastSwingLow).toBe(104.4);
    expect(f!.swing.lowBroken).toBe(true);
    expect(formatIntradayFeatures(f)).toContain("직전 저점 붕괴");
  });

  it("피보나치 — 스윙 고저 기준 레벨과 현재가 구간을 계산한다", () => {
    const f = extractIntradayFeatures(pullbackSeries(), 1, 130);
    expect(f!.fib).not.toBeNull();
    const { swingHigh, swingLow, levels, zone } = f!.fib!;
    expect(swingHigh).toBeGreaterThan(swingLow);
    const l382 = levels.find((l) => l.ratio === 0.382)!;
    expect(l382.price).toBe(Math.round(swingHigh - (swingHigh - swingLow) * 0.382));
    expect(zone.length).toBeGreaterThan(0);
  });

  it("단기 박스 — 변동폭 수축(다지기)을 감지한다", () => {
    const candles = pullbackSeries();
    // 마지막 5봉을 좁은 횡보로 교체(변동폭 ~0.3%).
    for (let i = 0; i < 5; i++) {
      candles[candles.length - 5 + i] = bar(
        `09:${String(20 + i).padStart(2, "0")}`,
        115,
        115.2,
        114.9,
        115.1,
      );
    }
    const f = extractIntradayFeatures(candles, 1, 130);
    expect(f!.box?.contracting).toBe(true);
    expect(formatIntradayFeatures(f)).toContain("수축(단기 다지기)");
  });

  it("전고 돌파를 표시한다", () => {
    const candles = pullbackSeries();
    candles.push(bar("09:25", 119, 130, 118.8, 129));
    const f = extractIntradayFeatures(candles, 1, 130);
    expect(f!.swing.highBroken).toBe(true);
    expect(formatIntradayFeatures(f)).toContain("전고 돌파 진행");
  });
});
