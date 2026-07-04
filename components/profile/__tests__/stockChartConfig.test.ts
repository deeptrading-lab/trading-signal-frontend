/**
 * stockChartConfig 상수 회귀 — 분봉 간격/기간 분리(minute-chart-interval-period).
 *
 * 검증:
 *   - MINUTE_PERIODS: 당일/1주/1개월 → priorDays 0/5/20, 1개월(20)에서 컷(3개월+ 미포함).
 *   - MINUTE_TIMEFRAMES: 1/3/5/10/15분 — 10분 추가.
 *   - 기본값 정합(DEFAULT_MINUTE_PRIOR_DAYS·DEFAULT_TIMEFRAME 이 각 목록에 존재).
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_MINUTE_PRIOR_DAYS,
  DEFAULT_TIMEFRAME,
  MINUTE_PERIODS,
  MINUTE_TIMEFRAMES,
} from "../stockChartConfig";

describe("MINUTE_PERIODS (분봉 기간 → priorDays)", () => {
  it("당일/1주/1개월 → priorDays 0/5/20 매핑", () => {
    expect(MINUTE_PERIODS.map((p) => [p.label, p.priorDays])).toEqual([
      ["당일", 0],
      ["1주", 5],
      ["1개월", 20],
    ]);
  });

  it("기본 기간 = 당일(priorDays 0), 첫 항목과 정합", () => {
    expect(DEFAULT_MINUTE_PRIOR_DAYS).toBe(0);
    expect(MINUTE_PERIODS[0].priorDays).toBe(DEFAULT_MINUTE_PRIOR_DAYS);
  });

  it("최대 priorDays 는 20(1개월) — 3개월+ 미포함(비현실적 컷)", () => {
    expect(Math.max(...MINUTE_PERIODS.map((p) => p.priorDays))).toBe(20);
  });

  it("priorDays 는 오름차순(선택기 노출 순서)", () => {
    const days = MINUTE_PERIODS.map((p) => p.priorDays);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
});

describe("MINUTE_TIMEFRAMES (분봉 간격)", () => {
  it("1/3/5/10/15분 — 10분 추가", () => {
    expect(MINUTE_TIMEFRAMES.map((t) => t.timeframe)).toEqual([1, 3, 5, 10, 15]);
  });

  it("기본 간격(5분)이 목록에 존재", () => {
    expect(MINUTE_TIMEFRAMES.some((t) => t.timeframe === DEFAULT_TIMEFRAME)).toBe(true);
    expect(DEFAULT_TIMEFRAME).toBe(5);
  });
});
