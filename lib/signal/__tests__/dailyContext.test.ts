import { describe, it, expect } from "vitest";
import { formatDailyContext } from "@/lib/signal/dailyContext";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const c = (i: number, close: number): StockDailyCandle =>
  ({ date: `2026-01-${String(i).padStart(3, "0")}`, open: close, high: close * 1.01, low: close * 0.99, close, volume: 1000 }) as StockDailyCandle;

describe("formatDailyContext (I1 일봉 흐름)", () => {
  it("봉 부족(<130)이면 빈 문자열(무주입)", () => {
    const few = Array.from({ length: 50 }, (_, i) => c(i, 100 + i));
    expect(formatDailyContext(few)).toBe("");
  });

  it("충분한 상승 캔들 → 정배열·상승 흐름 블록", () => {
    const up = Array.from({ length: 200 }, (_, i) => c(i, 100 + i * 0.5)); // 꾸준한 상승
    const out = formatDailyContext(up);
    expect(out).toContain("[일봉 흐름]");
    expect(out).toContain("정배열(상승추세)");
    expect(out).toMatch(/현재가 20일 위/);
  });

  it("충분한 하락 캔들 → 역배열·하락 흐름 블록", () => {
    const down = Array.from({ length: 200 }, (_, i) => c(i, 200 - i * 0.5)); // 꾸준한 하락
    const out = formatDailyContext(down);
    expect(out).toContain("[일봉 흐름]");
    expect(out).toContain("역배열(하락추세)");
    expect(out).toMatch(/현재가 20일 아래/);
  });
});
