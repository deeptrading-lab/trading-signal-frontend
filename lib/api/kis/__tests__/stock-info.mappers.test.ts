/**
 * `mapStockInfo` (lib/api/kis/mappers.ts) 단위 테스트.
 *
 * PRD `watchlist-real-data` §3.2, AC-2 — 종목명/메타 매핑 회귀 차단:
 *   1. prdt_abrv_name 우선 → 빈 값 시 prdt_name → 둘 다 빈 값 시 ticker fallback.
 *   2. mket_id_cd / excg_dvsn_cd → 시장 배지 매핑.
 *   3. tr_stop_yn / admn_item_yn "Y"/"N" → boolean.
 *   4. bstp_kor_isnm(업종명) 미사용 — KisSearchStockInfoOutput 에 존재하지 않음.
 */

import { describe, it, expect } from "vitest";
import { mapStockInfo } from "../mappers";
import type { KisSearchStockInfoOutput } from "../types";

const base: KisSearchStockInfoOutput = {
  prdt_abrv_name: "삼성전자",
  prdt_name: "삼성전자보통주",
  mket_id_cd: "STK",
  excg_dvsn_cd: "02",
  tr_stop_yn: "N",
  admn_item_yn: "N",
  kospi200_item_yn: "Y",
};

describe("mapStockInfo — 종목명 우선순위 (AC-2)", () => {
  it("[#1] prdt_abrv_name 가 있으면 표시 종목명으로 사용", () => {
    expect(mapStockInfo(base, "005930").name).toBe("삼성전자");
  });

  it("[#1] prdt_abrv_name 빈 값이면 prdt_name 으로 fallback", () => {
    const out = { ...base, prdt_abrv_name: "   " };
    expect(mapStockInfo(out, "005930").name).toBe("삼성전자보통주");
  });

  it("[#1] prdt_abrv_name·prdt_name 모두 빈 값이면 ticker fallback", () => {
    const out = { ...base, prdt_abrv_name: "", prdt_name: undefined };
    expect(mapStockInfo(out, "005930").name).toBe("005930");
  });
});

describe("mapStockInfo — 시장 매핑", () => {
  it("[#2] mket_id_cd=STK → KOSPI", () => {
    expect(mapStockInfo({ ...base, mket_id_cd: "STK" }, "005930").market).toBe(
      "KOSPI",
    );
  });

  it("[#2] mket_id_cd=KSQ → KOSDAQ", () => {
    expect(mapStockInfo({ ...base, mket_id_cd: "KSQ" }, "035720").market).toBe(
      "KOSDAQ",
    );
  });

  it("[#2] mket_id_cd 없고 excg_dvsn_cd=03 → KOSDAQ", () => {
    const out = { ...base, mket_id_cd: undefined, excg_dvsn_cd: "03" };
    expect(mapStockInfo(out, "035720").market).toBe("KOSDAQ");
  });

  it("[#2] 둘 다 미매핑 → 기타 graceful degrade", () => {
    const out = { ...base, mket_id_cd: "ZZZ", excg_dvsn_cd: "99" };
    expect(mapStockInfo(out, "000000").market).toBe("기타");
  });
});

describe("mapStockInfo — 거래정지/관리/코스피200 boolean", () => {
  it("[#3] tr_stop_yn=Y → isTradeStopped true", () => {
    expect(
      mapStockInfo({ ...base, tr_stop_yn: "Y" }, "005930").isTradeStopped,
    ).toBe(true);
  });

  it("[#3] admn_item_yn=Y → isAdminItem true", () => {
    expect(
      mapStockInfo({ ...base, admn_item_yn: "Y" }, "005930").isAdminItem,
    ).toBe(true);
  });

  it("[#3] N 값은 false", () => {
    const info = mapStockInfo(base, "005930");
    expect(info.isTradeStopped).toBe(false);
    expect(info.isAdminItem).toBe(false);
  });

  it("[#3] kospi200_item_yn=Y → isKospi200 true", () => {
    expect(mapStockInfo(base, "005930").isKospi200).toBe(true);
  });
});

describe("mapStockInfo — 업종명(industryName 상세, 기업개황 보강)", () => {
  it("std_idst_clsf_cd_name → industryName (상세)", () => {
    expect(
      mapStockInfo(
        { ...base, std_idst_clsf_cd_name: "반도체 제조업" },
        "005930",
      ).industryName,
    ).toBe("반도체 제조업");
  });

  it("industryName 빈 값/공백/미존재 → undefined", () => {
    expect(
      mapStockInfo({ ...base, std_idst_clsf_cd_name: "  " }, "005930")
        .industryName,
    ).toBeUndefined();
    expect(mapStockInfo(base, "005930").industryName).toBeUndefined();
  });
});

describe("mapStockInfo — 업종명 미사용 (AC-2 #4)", () => {
  it("[#4] bstp_kor_isnm 류 업종명 필드는 타입에 존재하지 않아 종목명에 절대 끼어들지 않음", () => {
    // KisSearchStockInfoOutput 에 bstp_kor_isnm 이 없으므로 추가 필드를 넣어도 무시된다.
    const out = {
      ...base,
      prdt_abrv_name: "",
      prdt_name: "",
      bstp_kor_isnm: "전기·전자",
    } as KisSearchStockInfoOutput;
    // 종목명은 ticker 로 fallback — 업종명이 끌려오면 안 됨.
    expect(mapStockInfo(out, "005930").name).toBe("005930");
  });
});
