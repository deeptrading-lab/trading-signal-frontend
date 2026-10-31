import { describe, it, expect } from "vitest";
import { makeCandles } from "@/lib/signal/__tests__/_fixtures";
import { calcMACD } from "@/lib/utils/technicalIndicators";
import { findDoubleBottom } from "../patterns";
import { RULEBOOK } from "../rulebook";
import { flatCloses, ramp } from "./_swingFixtures";

const rb = RULEBOOK;

/**
 * W 패턴 300봉 — 첫 바닥 i1=250(저가 9,000), 두 번째 바닥 i2=292(저가 9,020), t=299.
 * 사이 반등 고점 ≈ 9,530. 첫 하락(30봉 −940)이 두 번째(26봉 −460)보다 가팔라 MACD 는 i2 에서 덜 낮다.
 */
function wCloses(middle?: number[]): number[] {
  const mid = middle ?? [...ramp(9_060, 9_520, 15), ...ramp(9_520, 9_070, 26)];
  return [
    ...flatCloses(10_000, 220),
    ...ramp(10_000, 9_100, 30),
    9_060,
    ...mid,
    9_060,
    ...ramp(9_060, 9_200, 7),
  ];
}

function wBars(lowOverrides: Record<number, number> = {}, wick = 10, middle?: number[]) {
  const closes = wCloses(middle);
  const lows: number[] = [];
  lows[250] = 9_000;
  lows[292] = 9_020;
  for (const [i, v] of Object.entries(lowOverrides)) lows[Number(i)] = v;
  return makeCandles(closes, { wick, lows });
}

const macdOf = (bars: ReturnType<typeof makeCandles>) => calcMACD(bars.map((b) => b.close)).map((p) => p.macd);

describe("findDoubleBottom", () => {
  it("W 패턴 — 두 바닥·넥라인·MACD 상승 다이버전스를 찾는다", () => {
    const w = wBars();
    expect(w).toHaveLength(300);
    const db = findDoubleBottom(w, macdOf(w), rb);
    expect(db).not.toBeNull();
    expect(db!.i1).toBe(250);
    expect(db!.i2).toBe(292);
    expect(db!.l1).toBe(9_000);
    expect(db!.l2).toBe(9_020);
    expect(db!.neckline).toBeGreaterThan(9_500);
    expect(db!.divergence).toBe(true);
    expect(db!.breakout).toBe(false);
  });

  it("두 번째 바닥이 확정 전(오른쪽 3봉 미만)이면 null", () => {
    // 두 번째 하락을 t−1 까지 끌고 내려가 마지막 봉만 반등.
    const closes = [...flatCloses(10_000, 220), ...ramp(10_000, 9_100, 30), 9_060, ...ramp(9_060, 9_520, 15), ...ramp(9_520, 9_050, 32), 9_100];
    const lows: number[] = [];
    lows[250] = 9_000;
    const w = makeCandles(closes, { wick: 10, lows });
    expect(w).toHaveLength(299);
    expect(findDoubleBottom(w, macdOf(w), rb)).toBeNull();
  });

  it("두 바닥 가격 차가 1 ATR 을 넘으면 null", () => {
    const w = wBars({ 292: 8_900 });
    expect(findDoubleBottom(w, macdOf(w), rb)).toBeNull();
  });

  it("두 바닥 사이에 더 낮은 저가가 있으면 null", () => {
    const w = wBars({ 284: 8_990 });
    expect(findDoubleBottom(w, macdOf(w), rb)).toBeNull();
  });

  it("두 번째 바닥 이후 바닥 아래로 내려가면 null", () => {
    const w = wBars({ 297: 8_995 });
    expect(findDoubleBottom(w, macdOf(w), rb)).toBeNull();
  });

  it("사이 반등이 2 ATR 미만이면 null", () => {
    const flatMiddle = Array.from({ length: 41 }, () => 9_070);
    const w = wBars({}, 30, flatMiddle);
    expect(findDoubleBottom(w, macdOf(w), rb)).toBeNull();
  });

  it("다이버전스 — i1 MACD < 0, i2 > i1, t > i2 일 때만 true", () => {
    const w = wBars();
    const line = (m1: number, m2: number, mt: number) => {
      const xs: (number | null)[] = new Array(300).fill(0);
      xs[250] = m1;
      xs[292] = m2;
      xs[299] = mt;
      return xs;
    };
    expect(findDoubleBottom(w, line(-2, -1, 0), rb)!.divergence).toBe(true);
    expect(findDoubleBottom(w, line(-1, -2, 0), rb)!.divergence).toBe(false);
    expect(findDoubleBottom(w, line(1, 2, 3), rb)!.divergence).toBe(false); // 첫 바닥 MACD 가 0 위
    expect(findDoubleBottom(w, line(-2, -1, -1.5), rb)!.divergence).toBe(false); // t 가 i2 보다 낮음
  });
});
