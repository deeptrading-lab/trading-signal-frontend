/**
 * `lib/api/kis/mappers.ts` 의 `mapIndexPrice` + `INDEX_NAME_BY_CODE` 단위 테스트.
 *
 * PRD `market-real-data` AC-5 — 지수 매퍼 회귀 차단:
 *   1. prdy_vrss_sign "1/2"→up, "4/5"→down, else flat.
 *   2. 숫자 문자열 → number (빈값/NaN → 0).
 *   3. 지수코드 → 지수명 상수 매핑 정확성.
 *   4. 지수명에 `bstp_kor_isnm`(업종명)/`extractStockName` 미사용 (지수는 종목 아님).
 */

import { describe, it, expect } from "vitest";
import { mapIndexPrice } from "../mappers";
import { INDEX_NAME_BY_CODE } from "../types";
import type { KisInquireIndexPriceOutput } from "../types";

const baseOutput: KisInquireIndexPriceOutput = {
  bstp_nmix_prpr: "2750.23",
  bstp_nmix_prdy_vrss: "32.61",
  prdy_vrss_sign: "2",
  bstp_nmix_prdy_ctrt: "1.20",
  acml_vol: "512345678",
  acml_tr_pbmn: "9876543210000",
  bstp_nmix_oprc: "2720.10",
  bstp_nmix_hgpr: "2758.90",
  bstp_nmix_lwpr: "2715.40",
  ascn_issu_cnt: "612",
  down_issu_cnt: "268",
  stnr_issu_cnt: "54",
  dryy_bstp_nmix_hgpr: "2800.00",
  dryy_bstp_nmix_lwpr: "2400.00",
};

describe("INDEX_NAME_BY_CODE", () => {
  it("[#3] 코드 → 지수명 상수 매핑 정확성", () => {
    expect(INDEX_NAME_BY_CODE["0001"]).toBe("KOSPI");
    expect(INDEX_NAME_BY_CODE["1001"]).toBe("KOSDAQ");
    expect(INDEX_NAME_BY_CODE["2001"]).toBe("KOSPI200");
  });
});

describe("mapIndexPrice", () => {
  it("snake_case + 문자열 숫자를 camelCase + number 로 변환", () => {
    const result = mapIndexPrice(baseOutput, "0001");
    expect(result).toEqual({
      code: "0001",
      name: "KOSPI",
      value: 2_750.23,
      change: 32.61,
      changePercent: 1.2,
      direction: "up",
      volume: 512_345_678,
      tradeAmount: 9_876_543_210_000,
      advances: 612,
      declines: 268,
      unchanged: 54,
      open: 2_720.1,
      high: 2_758.9,
      low: 2_715.4,
      yearHigh: 2_800,
      yearLow: 2_400,
    });
  });

  it("[#1] prdy_vrss_sign 부호별 direction 매핑", () => {
    expect(mapIndexPrice({ ...baseOutput, prdy_vrss_sign: "1" }, "0001").direction).toBe("up");
    expect(mapIndexPrice({ ...baseOutput, prdy_vrss_sign: "2" }, "0001").direction).toBe("up");
    expect(mapIndexPrice({ ...baseOutput, prdy_vrss_sign: "3" }, "0001").direction).toBe("flat");
    expect(mapIndexPrice({ ...baseOutput, prdy_vrss_sign: "4" }, "0001").direction).toBe("down");
    expect(mapIndexPrice({ ...baseOutput, prdy_vrss_sign: "5" }, "0001").direction).toBe("down");
    expect(mapIndexPrice({ ...baseOutput, prdy_vrss_sign: "9" }, "0001").direction).toBe("flat");
  });

  it("[#2] 빈값/NaN 숫자 문자열 → 0", () => {
    const result = mapIndexPrice(
      {
        bstp_nmix_prpr: "",
        bstp_nmix_prdy_vrss: "not-a-number",
        prdy_vrss_sign: "3",
        bstp_nmix_prdy_ctrt: "",
        acml_vol: "",
        acml_tr_pbmn: "",
      } as KisInquireIndexPriceOutput,
      "1001",
    );
    expect(result.value).toBe(0);
    expect(result.change).toBe(0);
    expect(result.changePercent).toBe(0);
    expect(result.volume).toBe(0);
    // 빈 문자열 옵션 필드는 undefined 로 유지.
    expect(result.tradeAmount).toBeUndefined();
    expect(result.advances).toBeUndefined();
  });

  it("음수 change 처리", () => {
    const result = mapIndexPrice(
      { ...baseOutput, bstp_nmix_prdy_vrss: "-0.67", bstp_nmix_prdy_ctrt: "-0.18", prdy_vrss_sign: "5" },
      "2001",
    );
    expect(result.change).toBe(-0.67);
    expect(result.changePercent).toBe(-0.18);
    expect(result.direction).toBe("down");
  });

  it("[#4] 지수명은 상수 매핑만 사용 — 업종명 필드가 섞여도 무시", () => {
    // 코드가 실수로 bstp_kor_isnm 같은 업종명을 끌어쓰면 회귀 검출.
    const withBusinessName = {
      ...baseOutput,
      bstp_kor_isnm: "전기·전자",
    } as unknown as KisInquireIndexPriceOutput;
    const result = mapIndexPrice(withBusinessName, "0001");
    expect(result.name).toBe("KOSPI");
    expect(result.name).not.toBe("전기·전자");
  });

  it("상수에 없는 코드는 code 그대로 graceful degrade", () => {
    const result = mapIndexPrice(baseOutput, "9999");
    expect(result.name).toBe("9999");
  });
});
