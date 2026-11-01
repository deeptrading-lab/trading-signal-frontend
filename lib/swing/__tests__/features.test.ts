import { describe, it, expect } from "vitest";
import { computeFeatures, stageOf, windowOf, type SwingFeatures } from "../features";
import { RULEBOOK } from "../rulebook";
import { flatCloses, makeInput, ramp } from "./_swingFixtures";

const rb = RULEBOOK;

describe("computeFeatures — 수급 강도", () => {
  it("순매수(백만원)×1e6 ÷ ADV20(원) — 5일 외국인 +500백만원/일, 거래대금 100억/일 → 0.25", () => {
    const input = makeInput(flatCloses(10_000, 320), {
      flow: { tradingValue: 10_000_000_000, lastN: 5, nets: { foreign: 500, person: -800, institution: 300 } },
    });
    const f = computeFeatures(input, rb);
    expect(f.flowComplete).toBe(true);
    expect(f.adv20).toBe(10_000_000_000);
    expect(f.flow!.foreign).toBeCloseTo(0.25, 10);
    expect(f.flow!.person).toBeCloseTo(-0.4, 10);
    expect(f.flow!.institution).toBeCloseTo(0.15, 10);
  });

  it("최근 20봉 중 하루라도 수급이 없으면 flowComplete=false · flow=null", () => {
    const input = makeInput(flatCloses(10_000, 320));
    input.flow = input.flow.filter((_, i) => i !== input.flow.length - 7);
    const f = computeFeatures(input, rb);
    expect(f.flowComplete).toBe(false);
    expect(f.flow).toBeNull();
    expect(f.adv20).toBeNull();
  });

  it("20봉보다 과거의 수급 결측은 판정에 영향 없다", () => {
    const input = makeInput(flatCloses(10_000, 320));
    input.flow = input.flow.filter((_, i) => i !== 100);
    expect(computeFeatures(input, rb).flowComplete).toBe(true);
  });
});

describe("computeFeatures — 거래정지·공시", () => {
  it("최근 5봉 중 거래량 0 이 있으면 halted", () => {
    const input = makeInput(flatCloses(10_000, 320));
    input.bars[input.bars.length - 3].volume = 0;
    expect(computeFeatures(input, rb).halted).toBe(true);
  });

  it("공시 창 = (D[t−20], D[t]] · 정정(`[`) 제외 · 무상증자결정은 비대상", () => {
    const input = makeInput(flatCloses(10_000, 320));
    const d = (k: number) => input.bars[input.bars.length - 1 - k].date;
    input.events = [
      { date: d(0), reportName: "주요사항보고서(유상증자결정)" },
      { date: d(20), reportName: "주요사항보고서(전환사채권발행결정)" }, // 경계 — 창 밖
      { date: d(19), reportName: "주요사항보고서(신주인수권부사채권발행결정)" },
      { date: d(3), reportName: "[기재정정]주요사항보고서(유상증자결정)" },
      { date: d(2), reportName: "주요사항보고서(무상증자결정)" },
      { date: d(1), reportName: "주요사항보고서(자기주식취득결정)" },
    ];
    const f = computeFeatures(input, rb);
    expect(f.dartReports).toEqual([
      "주요사항보고서(신주인수권부사채권발행결정)",
      "주요사항보고서(유상증자결정)",
    ]);
  });
});

describe("computeFeatures — 지표·교차", () => {
  it("V자 반등은 최근 SMA5×20 골든크로스, 단조 하락은 교차 없음", () => {
    const v = makeInput([...flatCloses(10_000, 270), ...ramp(10_000, 9_000, 20), ...ramp(9_000, 9_700, 10)]);
    const down = makeInput([...flatCloses(10_000, 270), ...ramp(10_000, 8_500, 30)]);
    expect(computeFeatures(v, rb).maCrossAgo).not.toBeNull();
    expect(computeFeatures(down, rb).maCrossAgo).toBeNull();
    expect(computeFeatures(down, rb).macdCrossAgo).toBeNull();
  });

  it("1년 거래량가중 평균가·SMA250 대비 위치를 계산한다", () => {
    const f = computeFeatures(makeInput(flatCloses(10_000, 320)), rb);
    expect(f.sma250).not.toBeNull();
    expect(f.vwap250).not.toBeNull();
    expect(Math.abs(f.dev250Pct!)).toBeLessThan(1);
  });

  it("windowOf — 정렬 안 된 입력도 오름차순 마지막 n 봉", () => {
    const bars = makeInput(flatCloses(10_000, 10)).bars;
    const shuffled = [bars[3], bars[0], bars[9], ...bars.slice(4, 9), bars[1], bars[2]];
    expect(windowOf(shuffled, 3).map((b) => b.date)).toEqual(bars.slice(-3).map((b) => b.date));
  });
});

describe("stageOf — 앞에서부터 먼저 걸리는 것", () => {
  const base: SwingFeatures = {
    asOf: "2025-01-02",
    close: 10_000,
    barCount: 300,
    closeVolAdv20: 1e10,
    adv20: 1e10,
    flowComplete: true,
    flow: null,
    atr: 200,
    atrPct: 2,
    r20Pct: 0,
    rsi: 50,
    sma5: 10_000,
    sma20: 10_000,
    sma60: 10_000,
    sma250: 10_000,
    dev250Pct: 0,
    slope250Pct: 0,
    vwap250: 10_000,
    devVwap250Pct: 0,
    box60Pct: 30,
    barsSinceLow60: 30,
    macdCrossAgo: null,
    maCrossAgo: null,
    halted: false,
    dartReports: [],
    stage: null,
    macdLine: [],
  };
  const s = (o: Partial<SwingFeatures>) => stageOf({ ...base, ...o }, rb);

  it("과열 — r20 ≥ 20% 또는 RSI ≥ 75 가 다른 모든 것보다 먼저", () => {
    expect(s({ r20Pct: 20, dev250Pct: -30, close: 7_000, sma20: 6_900 })).toBe("overheated");
    expect(s({ rsi: 75 })).toBe("overheated");
    expect(s({ r20Pct: 19.99, rsi: 74.99 })).not.toBe("overheated");
  });

  it("바닥권 — dev250 ≤ −15% · 저점 후 10봉 이상 · 종가 ≥ SMA20 (하락추세보다 먼저)", () => {
    const bottom = { close: 8_000, dev250Pct: -20, sma250: 10_000, slope250Pct: -1, sma60: 8_500, sma20: 7_900 };
    expect(s({ ...bottom, barsSinceLow60: 10 })).toBe("bottoming");
    expect(s({ ...bottom, barsSinceLow60: 9 })).toBe("downtrend");
    expect(s({ ...bottom, barsSinceLow60: 12, sma20: 8_100 })).toBe("downtrend");
  });

  it("상승추세 / 횡보 / 혼조", () => {
    expect(s({ close: 11_000, sma250: 10_000, slope250Pct: 1, sma60: 10_500, dev250Pct: 10 })).toBe("uptrend");
    expect(s({ box60Pct: 25 })).toBe("range");
    expect(s({ box60Pct: 26 })).toBe("mixed");
  });

  it("필요한 값이 없으면 null", () => {
    expect(s({ sma250: null, dev250Pct: null, slope250Pct: null })).toBeNull();
  });
});
