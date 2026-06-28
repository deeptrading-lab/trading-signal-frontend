/**
 * 분봉 데이터 레이어 순수 함수 단위 테스트 (intraday-scalping-agent §3-1).
 *
 * 검증 대상:
 *   - formatMinuteStamp/mapMinuteCandle: date="YYYY-MM-DDTHH:mm" 정렬키(구조적 함정 차단)
 *   - resampleMinuteCandles: 1분봉 → N분봉 버킷 집계(OHLCV·날짜경계 비병합)
 */

import { describe, it, expect } from "vitest";
import { formatMinuteStamp, mapMinuteCandle } from "../mappers";
import { resampleMinuteCandles, dropFillerBars } from "../minuteChartChunked";
import type { KisInquireTimeItemChartItem, StockMinuteCandle } from "../types";

describe("formatMinuteStamp", () => {
  it("YYYYMMDD + HHMMSS → YYYY-MM-DDTHH:mm", () => {
    expect(formatMinuteStamp("20260628", "093500", "2026-06-28")).toBe("2026-06-28T09:35");
  });

  it("날짜 누락 시 fallback 기준일 사용", () => {
    expect(formatMinuteStamp(undefined, "151000", "2026-06-28")).toBe("2026-06-28T15:10");
  });

  it("HHMMSS 짧으면 0-pad 후 HH:mm 추출", () => {
    expect(formatMinuteStamp("20260628", "90000", "2026-06-28")).toBe("2026-06-28T09:00");
  });
});

describe("mapMinuteCandle", () => {
  it("close=stck_prpr, volume=cntg_vol, date=타임스탬프로 매핑", () => {
    const item: KisInquireTimeItemChartItem = {
      stck_bsop_date: "20260628",
      stck_cntg_hour: "100500",
      stck_oprc: "70500",
      stck_hgpr: "70900",
      stck_lwpr: "70400",
      stck_prpr: "70800",
      cntg_vol: "12000",
    };
    expect(mapMinuteCandle(item, "2026-06-28")).toEqual({
      date: "2026-06-28T10:05",
      open: 70_500,
      high: 70_900,
      low: 70_400,
      close: 70_800,
      volume: 12_000,
    });
  });

  it("결측 필드는 0 으로 방어", () => {
    const c = mapMinuteCandle({ stck_cntg_hour: "090100" }, "2026-06-28");
    expect(c).toMatchObject({ date: "2026-06-28T09:01", open: 0, close: 0, volume: 0 });
  });

  it("date 가 사전식 정렬 = 시간순 (정렬키 함정 회귀 차단)", () => {
    const a = mapMinuteCandle({ stck_cntg_hour: "090100" }, "2026-06-28").date;
    const b = mapMinuteCandle({ stck_cntg_hour: "150000" }, "2026-06-28").date;
    expect(a < b).toBe(true);
  });
});

describe("resampleMinuteCandles", () => {
  const oneMin = (hhmm: string, o: number, h: number, l: number, c: number, v: number): StockMinuteCandle => ({
    date: `2026-06-28T${hhmm}`,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: v,
  });

  it("tf<=1 이면 입력 그대로", () => {
    const input = [oneMin("09:00", 1, 2, 0, 1, 10)];
    expect(resampleMinuteCandles(input, 1)).toEqual(input);
  });

  it("5분봉: 09:00~09:04 → 한 버킷(open=첫, high=max, low=min, close=마지막, vol=합)", () => {
    const input = [
      oneMin("09:00", 100, 105, 99, 102, 10),
      oneMin("09:01", 102, 108, 101, 107, 20),
      oneMin("09:02", 107, 107, 103, 104, 15),
      oneMin("09:03", 104, 106, 100, 101, 12),
      oneMin("09:04", 101, 110, 100, 109, 18),
      oneMin("09:05", 109, 111, 108, 110, 5),
    ];
    const out = resampleMinuteCandles(input, 5);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      date: "2026-06-28T09:00",
      open: 100,
      high: 110,
      low: 99,
      close: 109,
      volume: 75,
    });
    expect(out[1]).toMatchObject({ date: "2026-06-28T09:05", open: 109, close: 110, volume: 5 });
  });

  it("버킷 라벨은 tf 로 내림 정렬(09:00,09:05,...)", () => {
    const input = Array.from({ length: 15 }, (_, i) => {
      const m = 9 * 60 + i;
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      return oneMin(`${hh}:${mm}`, 100, 100, 100, 100, 1);
    });
    const out = resampleMinuteCandles(input, 5);
    expect(out.map((c) => c.date)).toEqual([
      "2026-06-28T09:00",
      "2026-06-28T09:05",
      "2026-06-28T09:10",
    ]);
  });

  it("날짜 경계(오버나잇)는 한 버킷으로 병합되지 않음", () => {
    const input = [
      { date: "2026-06-26T15:25", open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { date: "2026-06-29T09:00", open: 2, high: 2, low: 2, close: 2, volume: 1 },
    ];
    const out = resampleMinuteCandles(input, 5);
    expect(out).toHaveLength(2);
    expect(out[0].date.slice(0, 10)).toBe("2026-06-26");
    expect(out[1].date.slice(0, 10)).toBe("2026-06-29");
  });
});

describe("dropFillerBars", () => {
  const bar = (hhmm: string, price: number, volume: number): StockMinuteCandle => ({
    date: `2026-06-26T${hhmm}`,
    open: price,
    high: price,
    low: price,
    close: price,
    volume,
  });

  it("거래량 0 채움봉 제거, 거래량>0 봉(종가 동시호가 포함) 유지", () => {
    const bars = [
      bar("09:00", 100, 1_000),
      bar("12:15", 95, 0), // 무거래 채움
      bar("12:20", 95, 0), // 무거래 채움
      bar("15:30", 99, 5_000_000), // 종가 동시호가 — 유지
    ];
    expect(dropFillerBars(bars).map((c) => c.date)).toEqual([
      "2026-06-26T09:00",
      "2026-06-26T15:30",
    ]);
  });

  it("리샘플 전 필터: 5분 버킷이 전부 0거래량이면 버킷 자체가 사라짐", () => {
    const oneMin = [
      bar("09:00", 100, 500),
      bar("09:01", 101, 300),
      bar("09:05", 99, 0), // 09:05 버킷 전부 무거래
      bar("09:06", 99, 0),
    ];
    const out = resampleMinuteCandles(dropFillerBars(oneMin), 5);
    expect(out.map((c) => c.date)).toEqual(["2026-06-26T09:00"]);
  });
});
