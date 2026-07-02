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

describe("당일 컨텍스트 · VWAP · 오프닝 레인지 · 모멘텀", () => {
  /** 전일(09:00~09:09, 종가 100) + 당일(09:00~, 시가 102 갭업) 2일 시리즈. */
  function twoDaySeries(): StockMinuteCandle[] {
    const out: StockMinuteCandle[] = [];
    for (let i = 0; i < 10; i++) {
      const p = 98 + i * 0.2;
      out.push({
        date: `2026-07-02T09:0${i}`,
        open: p, high: p + 0.5, low: p - 0.5, close: i === 9 ? 100 : p + 0.2, volume: 1000,
      });
    }
    for (let i = 0; i < 40; i++) {
      const p = 102 + i * 0.1;
      const hh = String(9 + Math.floor(i / 60)).padStart(2, "0");
      const mm = String(i % 60).padStart(2, "0");
      out.push({
        date: `2026-07-03T${hh}:${mm}`,
        // 마지막 봉은 고가 마감 — 당일 신고가권(nearDayHigh) 판정 확인용.
        open: p, high: p + 0.4, low: p - 0.3, close: i === 39 ? p + 0.4 : p + 0.2, volume: 1000 + i,
      });
    }
    return out;
  }

  it("갭%·전일 고저종·당일 신고가권을 계산한다", () => {
    const f = extractIntradayFeatures(twoDaySeries(), 1, 200);
    expect(f!.day?.gapPct).toBe(2); // (102-100)/100
    expect(f!.day?.prevClose).toBe(100);
    expect(f!.day?.open).toBe(102);
    expect(f!.day?.nearDayHigh).toBe(true); // 상승 지속 — 종가가 당일 고가권.
    expect(formatIntradayFeatures(f)).toContain("갭 +2%");
  });

  it("VWAP — 당일 거래량 가중 평균이 당일 고저 범위 안", () => {
    const f = extractIntradayFeatures(twoDaySeries(), 1, 200);
    const { vwap, day } = f!;
    expect(vwap).not.toBeNull();
    expect(vwap!.price).toBeGreaterThanOrEqual(Math.floor(day!.dayLow));
    expect(vwap!.price).toBeLessThanOrEqual(Math.ceil(day!.dayHigh));
    // 지속 상승이라 현재가가 VWAP 위.
    expect(vwap!.gapPct).toBeGreaterThan(0);
  });

  it("오프닝 레인지 — 09:30 이전 고저와 상단 돌파 판정", () => {
    const f = extractIntradayFeatures(twoDaySeries(), 1, 200);
    const or = f!.openingRange!;
    // 09:00~09:29 저가 = 102-0.3, 고가 = 09:29 봉(104.9)+0.4.
    expect(or.low).toBeCloseTo(101.7, 5);
    expect(or.high).toBeCloseTo(105.3, 5);
    expect(or.forming).toBe(false); // 마지막 봉 09:39.
    expect(or.position).toBe("상단 돌파");
  });

  it("모멘텀 — 지속 상승이면 RSI 고수준 + 연속 양봉", () => {
    const f = extractIntradayFeatures(twoDaySeries(), 1, 200);
    expect(f!.momentum.rsi).not.toBeNull();
    expect(f!.momentum.rsi!).toBeGreaterThan(70);
    expect(f!.momentum.streak).toBeGreaterThan(5);
  });

  it("피처 블록에 새 섹션이 포함된다", () => {
    const text = formatIntradayFeatures(extractIntradayFeatures(twoDaySeries(), 1, 200));
    expect(text).toContain("[당일 컨텍스트]");
    expect(text).toContain("[VWAP]");
    expect(text).toContain("[오프닝 레인지 ~09:30]");
    expect(text).toContain("[모멘텀]");
  });
});
