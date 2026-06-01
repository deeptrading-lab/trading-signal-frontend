/**
 * `lib/api/kis/mappers.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` AC-10 — 종목명 vs 업종명 회귀 차단:
 *   1. hts_kor_isnm 존재 → 종목명 = hts_kor_isnm
 *   2. hts_kor_isnm 비고 prdt_name 존재 → 종목명 = prdt_name
 *   3. 둘 다 비면 → 종목명 = ticker 그대로
 *   4. bstp_kor_isnm 은 절대 종목명으로 사용 안 됨 (업종명 필드)
 */

import { describe, it, expect } from "vitest";
import {
  extractStockName,
  mapDailyCandle,
  mapStockPrice,
} from "../mappers";
import type {
  KisInquireDailyPriceItem,
  KisInquirePriceOutput,
} from "../types";

describe("extractStockName (AC-10 회귀 차단)", () => {
  it("[#1] hts_kor_isnm 가 있으면 그 값을 종목명으로 사용", () => {
    const name = extractStockName(
      { hts_kor_isnm: "삼성전자" },
      "005930",
    );
    expect(name).toBe("삼성전자");
  });

  it("[#2] hts_kor_isnm 가 빈 문자열·undefined 면 prdt_name fallback", () => {
    expect(extractStockName({ prdt_name: "삼성전자" }, "005930")).toBe(
      "삼성전자",
    );
    expect(
      extractStockName({ hts_kor_isnm: "", prdt_name: "현대차" }, "005380"),
    ).toBe("현대차");
    expect(
      extractStockName(
        { hts_kor_isnm: "   ", prdt_name: "기아" },
        "000270",
      ),
    ).toBe("기아");
  });

  it("[#3] 둘 다 비면 ticker 그대로 반환", () => {
    expect(extractStockName({}, "005930")).toBe("005930");
    expect(extractStockName({ hts_kor_isnm: "", prdt_name: "" }, "005930")).toBe(
      "005930",
    );
  });

  it("[#4] bstp_kor_isnm (업종명) 은 종목명으로 절대 사용 안 됨", () => {
    // 만약 함수가 bstp_kor_isnm 을 잘못 참조하면 "전기·전자" 가 나와 fail.
    const output = {
      // hts_kor_isnm, prdt_name 둘 다 없음 — fallback 으로 ticker 가 나와야 함.
      // bstp_kor_isnm 은 의도적으로 채워둠 — 코드가 실수로 참조하면 회귀 검출.
    } as unknown as Pick<
      KisInquirePriceOutput,
      "hts_kor_isnm" | "prdt_name"
    > & { bstp_kor_isnm: string };
    output.bstp_kor_isnm = "전기·전자";

    const name = extractStockName(output, "005930");
    expect(name).toBe("005930");
    expect(name).not.toBe("전기·전자");
  });
});

describe("mapStockPrice", () => {
  it("snake_case + 문자열 숫자를 camelCase + number 로 변환", () => {
    const kis: KisInquirePriceOutput = {
      hts_kor_isnm: "삼성전자",
      bstp_kor_isnm: "전기·전자", // 종목명엔 안 쓰임(name=삼성전자), 업종 sector 로만 매핑.
      stck_prpr: "71500",
      prdy_vrss: "500",
      prdy_ctrt: "0.70",
      prdy_vrss_sign: "2",
      acml_vol: "12345678",
      stck_oprc: "71000",
      stck_hgpr: "71900",
      stck_lwpr: "70800",
    };
    const result = mapStockPrice(kis, "005930");
    expect(result).toEqual({
      ticker: "005930",
      name: "삼성전자",
      price: 71_500,
      change: 500,
      changePercent: 0.7,
      direction: "up",
      volume: 12_345_678,
      open: 71_000,
      high: 71_900,
      low: 70_800,
      sector: "전기·전자",
    });
  });

  it("bstp_kor_isnm → sector (업종, 종목명과 분리)", () => {
    const kis: KisInquirePriceOutput = {
      hts_kor_isnm: "셀트리온",
      bstp_kor_isnm: "제약",
      stck_prpr: "180000",
      prdy_vrss: "0",
      prdy_ctrt: "0",
      prdy_vrss_sign: "3",
      acml_vol: "0",
    };
    const result = mapStockPrice(kis, "068270");
    expect(result.sector).toBe("제약");
    expect(result.name).toBe("셀트리온"); // 종목명은 hts_kor_isnm, sector 와 절대 안 섞임.
  });

  it("bstp_kor_isnm 누락/공백 → sector undefined", () => {
    const kis = {
      hts_kor_isnm: "종목",
      stck_prpr: "1000",
      prdy_vrss: "0",
      prdy_ctrt: "0",
      prdy_vrss_sign: "3",
      acml_vol: "0",
    } as KisInquirePriceOutput;
    expect(mapStockPrice(kis, "000000").sector).toBeUndefined();
    expect(
      mapStockPrice({ ...kis, bstp_kor_isnm: "  " }, "000000").sector,
    ).toBeUndefined();
  });

  it("음수 change + 하락 방향", () => {
    const kis: KisInquirePriceOutput = {
      hts_kor_isnm: "SK하이닉스",
      stck_prpr: "175300",
      prdy_vrss: "-2700",
      prdy_ctrt: "-1.52",
      prdy_vrss_sign: "5",
      acml_vol: "4567890",
    };
    const result = mapStockPrice(kis, "000660");
    expect(result.change).toBe(-2700);
    expect(result.changePercent).toBe(-1.52);
    expect(result.direction).toBe("down");
  });

  it("보합 — prdy_vrss_sign='3' → direction='flat'", () => {
    const kis: KisInquirePriceOutput = {
      hts_kor_isnm: "NAVER",
      stck_prpr: "189500",
      prdy_vrss: "0",
      prdy_ctrt: "0",
      prdy_vrss_sign: "3",
      acml_vol: "678901",
    };
    expect(mapStockPrice(kis, "035420").direction).toBe("flat");
  });

  it("종목명 누락 시 ticker 로 graceful degrade", () => {
    const kis = {
      stck_prpr: "1000",
      prdy_vrss: "0",
      prdy_ctrt: "0",
      prdy_vrss_sign: "3",
      acml_vol: "0",
    } as KisInquirePriceOutput;
    expect(mapStockPrice(kis, "999999").name).toBe("999999");
  });
});

describe("mapDailyCandle", () => {
  it("YYYYMMDD → YYYY-MM-DD 변환", () => {
    const item: KisInquireDailyPriceItem = {
      stck_bsop_date: "20260527",
      stck_clpr: "71500",
      stck_oprc: "71000",
      stck_hgpr: "71900",
      stck_lwpr: "70800",
      acml_vol: "12345678",
    };
    const candle = mapDailyCandle(item);
    expect(candle.date).toBe("2026-05-27");
    expect(candle.close).toBe(71_500);
    expect(candle.open).toBe(71_000);
    expect(candle.high).toBe(71_900);
    expect(candle.low).toBe(70_800);
    expect(candle.volume).toBe(12_345_678);
  });

  it("비정상 일자 형식은 그대로 통과 (디펜시브)", () => {
    const item: KisInquireDailyPriceItem = {
      stck_bsop_date: "abcd",
      stck_clpr: "0",
      stck_oprc: "0",
      stck_hgpr: "0",
      stck_lwpr: "0",
      acml_vol: "0",
    };
    expect(mapDailyCandle(item).date).toBe("abcd");
  });
});
