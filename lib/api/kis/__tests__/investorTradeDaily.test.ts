import { describe, it, expect } from "vitest";
import { isInvestorTradeFiller, mapInvestorTradeDay } from "../investor-flow";

const row = (o: Record<string, string>): Record<string, string> => ({
  stck_bsop_date: "20261030",
  stck_clpr: "220500",
  acml_tr_pbmn: "4377894314750",
  prsn_ntby_tr_pbmn: "-29232",
  frgn_ntby_tr_pbmn: "-232233",
  orgn_ntby_tr_pbmn: "390802",
  fund_ntby_tr_pbmn: "333424",
  pe_fund_ntby_tr_pbmn: "-69992",
  ...o,
});

describe("FHPTJ04160001 행 매핑", () => {
  it("정상 행 — 거래대금(원)·순매수(백만원) 원본 단위 그대로", () => {
    expect(mapInvestorTradeDay(row({}), "005930")).toEqual({
      date: "2026-10-30",
      tradingValue: 4_377_894_314_750,
      person: -29_232,
      foreign: -232_233,
      institution: 390_802,
      pension: 333_424,
      privateEquity: -69_992,
    });
  });

  it("상장 전 채움 행(종가·거래대금 공백, 순매수 0)은 채움으로 본다", () => {
    const filler = row({ stck_clpr: "", acml_tr_pbmn: "", prsn_ntby_tr_pbmn: "0", frgn_ntby_tr_pbmn: "0" });
    expect(isInvestorTradeFiller(filler)).toBe(true);
    expect(isInvestorTradeFiller(row({}))).toBe(false);
  });

  it("일부 칸만 빈 행은 채움이 아니고 매핑에서 거부된다(가짜 0 금지)", () => {
    const partial = row({ prsn_ntby_tr_pbmn: "" });
    expect(isInvestorTradeFiller(partial)).toBe(false);
    expect(() => mapInvestorTradeDay(partial, "005930")).toThrow();
    expect(() => mapInvestorTradeDay(row({ acml_tr_pbmn: "" }), "005930")).toThrow();
  });
});
