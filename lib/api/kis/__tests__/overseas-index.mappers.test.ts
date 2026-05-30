/**
 * `lib/api/kis/overseas-index.ts` 의 `mapOverseasIndex` + `buildDateRange` +
 * `OVERSEAS_INDEX_NAME_BY_CODE` 단위 테스트.
 *
 * PRD `header-market-ticker` AC-14 — 해외지수 매퍼 회귀 차단:
 *   1. prdy_vrss_sign "1/2"→up, "4/5"→down, else flat.
 *   2. 숫자 문자열 → number (빈값/NaN → 0).
 *   3. output1(요약) 비었을 때 output2[0](최신 캔들 종가) 폴백.
 *   4. 지수명은 상수 매핑만 사용(응답 hts_kor_isnm 미사용).
 */

import { describe, it, expect } from "vitest";
import {
  buildDateRange,
  mapOverseasIndex,
} from "../overseas-index";
import { OVERSEAS_INDEX_NAME_BY_CODE } from "../types";
import type { KisOverseasDailyChartResponse } from "../types";

const baseResponse: Pick<
  KisOverseasDailyChartResponse,
  "output1" | "output2"
> = {
  output1: {
    ovrs_nmix_prpr: "7580.06",
    ovrs_nmix_prdy_vrss: "46.85",
    prdy_vrss_sign: "2",
    prdy_ctrt: "0.62",
    hts_kor_isnm: "S&P500",
  },
  output2: [
    { stck_bsop_date: "20260530", ovrs_nmix_prpr: "7580.06" },
    { stck_bsop_date: "20260529", ovrs_nmix_prpr: "7533.21" },
  ],
};

describe("OVERSEAS_INDEX_NAME_BY_CODE", () => {
  it("코드 → 지수명 상수 매핑(SPX=S&P 500, COMP=NASDAQ)", () => {
    expect(OVERSEAS_INDEX_NAME_BY_CODE.SPX).toBe("S&P 500");
    expect(OVERSEAS_INDEX_NAME_BY_CODE.COMP).toBe("NASDAQ");
  });
});

describe("mapOverseasIndex", () => {
  it("output1 요약 → 클라이언트 친화 스키마(숫자 변환)", () => {
    const result = mapOverseasIndex(baseResponse, "SPX");
    expect(result).toEqual({
      code: "SPX",
      name: "S&P 500",
      value: 7_580.06,
      change: 46.85,
      changePercent: 0.62,
      direction: "up",
      volume: 0,
    });
  });

  it("[#1] prdy_vrss_sign 부호별 direction 매핑", () => {
    const make = (sign: string) =>
      mapOverseasIndex(
        { ...baseResponse, output1: { ...baseResponse.output1, prdy_vrss_sign: sign } },
        "SPX",
      ).direction;
    expect(make("1")).toBe("up");
    expect(make("2")).toBe("up");
    expect(make("3")).toBe("flat");
    expect(make("4")).toBe("down");
    expect(make("5")).toBe("down");
    expect(make("9")).toBe("flat");
  });

  it("[#3] output1 현재값이 0/빈값이면 output2[0] 최신 캔들 종가로 폴백", () => {
    const result = mapOverseasIndex(
      {
        output1: { ovrs_nmix_prpr: "", prdy_ctrt: "0.62", prdy_vrss_sign: "2" },
        output2: [
          { stck_bsop_date: "20260530", ovrs_nmix_prpr: "26972.62" },
          { stck_bsop_date: "20260529", ovrs_nmix_prpr: "26800.00" },
        ],
      },
      "COMP",
    );
    expect(result.value).toBe(26_972.62);
    expect(result.name).toBe("NASDAQ");
  });

  it("[#2] output1·output2 모두 비면 value 0", () => {
    const result = mapOverseasIndex({ output1: {}, output2: [] }, "SPX");
    expect(result.value).toBe(0);
    expect(result.change).toBe(0);
    expect(result.changePercent).toBe(0);
    expect(result.direction).toBe("flat");
  });

  it("음수 change 처리", () => {
    const result = mapOverseasIndex(
      {
        output1: {
          ovrs_nmix_prpr: "26972.62",
          ovrs_nmix_prdy_vrss: "-92.10",
          prdy_ctrt: "-0.34",
          prdy_vrss_sign: "5",
        },
      },
      "COMP",
    );
    expect(result.change).toBe(-92.1);
    expect(result.changePercent).toBe(-0.34);
    expect(result.direction).toBe("down");
  });

  it("[#4] 지수명은 상수 매핑만 — hts_kor_isnm 미사용", () => {
    const result = mapOverseasIndex(
      {
        output1: {
          ...baseResponse.output1,
          hts_kor_isnm: "엉뚱한이름",
        },
      },
      "SPX",
    );
    expect(result.name).toBe("S&P 500");
    expect(result.name).not.toBe("엉뚱한이름");
  });

  it("상수에 없는 코드는 code 그대로 graceful degrade", () => {
    const result = mapOverseasIndex(baseResponse, "DJI");
    expect(result.name).toBe("DJI");
  });
});

describe("buildDateRange", () => {
  it("기본 lookback 10일 — 시작일이 종료일보다 과거, YYYYMMDD 8자리", () => {
    const now = new Date("2026-05-30T00:00:00Z");
    const { start, end } = buildDateRange(10, now);
    expect(end).toMatch(/^\d{8}$/);
    expect(start).toMatch(/^\d{8}$/);
    expect(Number(start)).toBeLessThan(Number(end));
  });

  it("lookback 일수만큼 시작일을 당긴다", () => {
    const now = new Date("2026-05-30T12:00:00");
    const { start, end } = buildDateRange(10, now);
    expect(end.slice(0, 6)).toBe("202605");
    // 2026-05-30 - 10일 = 2026-05-20.
    expect(start).toBe("20260520");
  });
});
