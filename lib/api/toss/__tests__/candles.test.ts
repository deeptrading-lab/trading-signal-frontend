/**
 * `lib/api/toss/candles.ts` — 주/월봉 리샘플 단위 테스트.
 *
 * PRD `toss-market-data-adapter` AC-8 — 토스는 interval 1d 뿐이라 W/M 은 일봉 리샘플로 만든다.
 * 집계 규칙: open=버킷 첫 봉 시가, high/low=극값, close=마지막 봉 종가, volume=합산,
 * date 라벨=버킷 마지막 거래일. 주 버킷은 ISO 주(월요일 기준), 월 버킷은 YYYY-MM.
 */

import { describe, it, expect } from "vitest";
import { resampleDailyCandles } from "../candles";
import type { StockDailyCandle } from "@/lib/api/kis/types";

function candle(
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
): StockDailyCandle {
  return { date, open, high, low, close, volume };
}

describe("resampleDailyCandles — W(주봉)", () => {
  it("같은 ISO 주(월~금)를 한 봉으로 집계하고 주 경계에서 끊는다", () => {
    // 2026-06-29(월) ~ 07-03(금) 이 한 주, 07-06(월) 부터 다음 주.
    const daily = [
      candle("2026-06-29", 100, 110, 95, 105, 10),
      candle("2026-06-30", 105, 120, 104, 118, 20),
      candle("2026-07-01", 118, 119, 90, 92, 30),
      candle("2026-07-06", 92, 95, 91, 94, 40),
    ];

    const weekly = resampleDailyCandles(daily, "W");
    expect(weekly).toHaveLength(2);

    expect(weekly[0]).toEqual({
      date: "2026-06-29", // 버킷 첫 거래일 (KIS 주봉 라벨 파리티)
      open: 100, // 첫 봉 시가
      high: 120, // 극값
      low: 90,
      close: 92, // 마지막 봉 종가
      volume: 60, // 합산
    });
    expect(weekly[1].date).toBe("2026-07-06");
    expect(weekly[1].volume).toBe(40);
  });

  it("일요일은 직전 월요일 주에 속한다 (ISO 주 — 월요일 시작)", () => {
    const daily = [
      candle("2026-07-03", 1, 2, 1, 2, 1), // 금
      candle("2026-07-05", 2, 3, 2, 3, 1), // 일 — 같은 주
      candle("2026-07-06", 3, 4, 3, 4, 1), // 월 — 다음 주
    ];
    const weekly = resampleDailyCandles(daily, "W");
    expect(weekly).toHaveLength(2);
    expect(weekly[0].close).toBe(3);
  });
});

describe("resampleDailyCandles — M(월봉)", () => {
  it("월 경계(YYYY-MM)로 집계한다", () => {
    const daily = [
      candle("2026-06-29", 100, 110, 95, 105, 10),
      candle("2026-06-30", 105, 120, 104, 118, 20),
      candle("2026-07-01", 118, 119, 90, 92, 30),
    ];
    const monthly = resampleDailyCandles(daily, "M");
    expect(monthly).toHaveLength(2);
    expect(monthly[0]).toEqual({
      date: "2026-06-29", // 버킷 첫 거래일
      open: 100,
      high: 120,
      low: 95,
      close: 118,
      volume: 30,
    });
    expect(monthly[1].date).toBe("2026-07-01");
  });

  it("빈 입력은 빈 배열", () => {
    expect(resampleDailyCandles([], "M")).toEqual([]);
  });
});
