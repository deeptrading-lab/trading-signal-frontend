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

// ─── 셋업 이벤트(교차) — preGate 트리거 (PR-3b, AC-13) ───────────────────────

describe("셋업 이벤트(교차) — vwapReclaim · orBreakout · volumeZSurge", () => {
  /** 꼬리 없는 평평한 봉(o=h=l=c) — VWAP=가격 가중평균이 손검산 가능. */
  function flat(time: string, p: number, v = 1000): StockMinuteCandle {
    return bar(time, p, p, p, p, v);
  }
  const t = (i: number) =>
    `${String(9 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`;

  describe("vwapReclaim — VWAP 재탈환", () => {
    // 마지막 봉은 진행 중 취급 — 교차 판정 쌍은 끝에서 두 번째(마감) vs 세 번째.
    const crossing = [100, 100, 100, 100, 90, 112]; // 90 봉: VWAP(98) 아래 → 112 봉: VWAP(100.3) 위
    it("아래→위 교차 봉에서 발화한다", () => {
      const candles = [...crossing, 112].map((p, i) => flat(t(i), p));
      const f = extractIntradayFeatures(candles, 1, 130)!;
      expect(f.vwapReclaim).toBe(true);
      expect(formatIntradayFeatures(f)).toContain("[셋업 이벤트] VWAP 재탈환");
    });
    it("AC-13: 위 체류 중(직후 봉)에는 재발화하지 않는다", () => {
      const candles = [...crossing, 112, 112].map((p, i) => flat(t(i), p));
      const f = extractIntradayFeatures(candles, 1, 130)!;
      expect(f.vwapReclaim).toBe(false);
      expect(formatIntradayFeatures(f)).not.toContain("[셋업 이벤트]");
    });
    it("경계 — 직전 종가 = VWAP(≤ 성립)이었다가 넘어서면 발화한다", () => {
      // 100×6 → VWAP 100, 직전 봉 종가 100(=VWAP) → 112 돌파.
      const candles = [100, 100, 100, 100, 100, 100, 112, 112].map((p, i) => flat(t(i), p));
      expect(extractIntradayFeatures(candles, 1, 130)!.vwapReclaim).toBe(true);
    });
    it("계속 아래(교차 없음)면 발화하지 않는다", () => {
      const candles = [100, 100, 100, 100, 90, 89, 89].map((p, i) => flat(t(i), p));
      expect(extractIntradayFeatures(candles, 1, 130)!.vwapReclaim).toBe(false);
    });
  });

  describe("orBreakout — 오프닝 레인지 상단 돌파", () => {
    /** OR(09:00~09:04, 고가 105) + 09:31 이후 봉들. */
    function orSeries(post: number[]): StockMinuteCandle[] {
      const or = [100, 105, 103, 102, 101].map((p, i) => flat(`09:0${i}`, p));
      return [...or, ...post.map((p, i) => flat(`09:3${1 + i}`, p))];
    }
    it("레인지 내 → 상단 돌파 교차 봉에서 발화한다", () => {
      // 마감봉 쌍: 104(≤105) → 106(>105). 마지막 107은 진행 중.
      const f = extractIntradayFeatures(orSeries([104, 106, 107]), 1, 130)!;
      expect(f.orBreakout).toBe(true);
      expect(formatIntradayFeatures(f)).toContain("오프닝 레인지 상단 돌파");
    });
    it("AC-13: 상단 체류 중(직후 봉)에는 재발화하지 않는다", () => {
      const f = extractIntradayFeatures(orSeries([104, 106, 107, 107]), 1, 130)!;
      expect(f.orBreakout).toBe(false);
    });
    it("레인지 형성 중(~09:30 이전)에는 판정하지 않는다", () => {
      const candles = [100, 105, 103, 102, 101, 104, 106, 107].map((p, i) => flat(`09:0${i}`, p));
      expect(extractIntradayFeatures(candles, 1, 130)!.orBreakout).toBe(false);
    });
  });

  describe("volumeZSurge — 거래량 z ≥ 2 교차", () => {
    /**
     * 직전 창 700/1400 교대(log std≈0.35) 뒤에 tail 거래량 — intradayAxes zCandles 와 동일 구도.
     * tail 마지막 원소는 진행 중 봉(판정 제외).
     */
    function zSeries(head: number, tail: number[]): StockMinuteCandle[] {
      const base = Array.from({ length: head }, (_, i) =>
        flat(t(i), 100, i % 2 === 0 ? 700 : 1_400),
      );
      return [...base, ...tail.map((v, i) => flat(t(head + i), 100, v))];
    }
    it("z<2 → z≥2 교차 봉에서 발화한다 (2,200 → z≈2.3)", () => {
      const f = extractIntradayFeatures(zSeries(44, [2_200, 1_000]), 1, 130)!;
      expect(f.volumeZSurge).toBe(true);
      expect(formatIntradayFeatures(f)).toContain("거래량 급증(z≥2)");
    });
    it("AC-13: 연속 z≥2(급증 지속)에는 재발화하지 않는다", () => {
      const f = extractIntradayFeatures(zSeries(44, [2_200, 2_200, 1_000]), 1, 130)!;
      expect(f.volumeZSurge).toBe(false);
    });
    it("직전 봉 z 미산출(룩백 경계)이면 교차 불성립 — 발화하지 않는다", () => {
      // n=42: 이번 마감봉(idx 40)은 z 산출 가능, 직전(idx 39)은 룩백(40) 미달 → null.
      const f = extractIntradayFeatures(zSeries(40, [2_200, 1_000]), 1, 130)!;
      expect(f.volumeZSurge).toBe(false);
    });
  });
});
