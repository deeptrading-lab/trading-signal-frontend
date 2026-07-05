/**
 * 업종 랭킹·구성종목 매퍼 + 화이트리스트 + 정렬 단위 테스트.
 *
 * PRD `trending-sectors` §3-1·§3-2 / AC-0. 회귀 차단:
 *   1. 산업 화이트리스트 — [5,30] 구간만 산업, 규모티어·테마 제외.
 *   2. output2 매핑 — 코드·업종명·등락률·방향(부호 우선).
 *   3. rankSectors — 화이트리스트 필터 + 등락률 내림차순 + 상위 N slice.
 *   4. 구성종목 매핑 — stck_shrn_iscd·현재가·등락률, marketCap 초기 null.
 */

import { describe, it, expect } from "vitest";
import { isKospiSectorCode } from "../sectorCodes";
import {
  mapSectorCategoryItem,
  rankSectors,
  type KisSectorCategoryItem,
} from "../sectors";
import { mapSectorConstituentItem } from "../sectorConstituents";

describe("isKospiSectorCode (산업 화이트리스트)", () => {
  it("[#1] 산업 구간 [5,30] 은 통과", () => {
    expect(isKospiSectorCode("0005")).toBe(true); // 음식료·담배
    expect(isKospiSectorCode("0013")).toBe(true); // 전기·전자
    expect(isKospiSectorCode("0030")).toBe(true); // 오락·문화
  });

  it("[#2] 규모티어·종합(< 5)은 제외", () => {
    expect(isKospiSectorCode("0001")).toBe(false); // 코스피 종합
    expect(isKospiSectorCode("0002")).toBe(false); // 대형주
    expect(isKospiSectorCode("0003")).toBe(false); // 중형주
    expect(isKospiSectorCode("0004")).toBe(false); // 소형주
  });

  it("[#3] 테마·파생(> 30)은 제외", () => {
    expect(isKospiSectorCode("0163")).toBe(false); // 고배당50
    expect(isKospiSectorCode("0195")).toBe(false); // 코스피TR
    expect(isKospiSectorCode("0503")).toBe(false); // VKOSPI
    expect(isKospiSectorCode("2180")).toBe(false); // ESG
  });

  it("[#4] 비-4자리·비숫자·공백 방어", () => {
    expect(isKospiSectorCode("13")).toBe(false);
    expect(isKospiSectorCode("00130")).toBe(false);
    expect(isKospiSectorCode("abcd")).toBe(false);
    expect(isKospiSectorCode(" 0013 ")).toBe(true); // trim 후 통과
  });
});

describe("mapSectorCategoryItem", () => {
  it("[#5] 코드·업종명·등락률 매핑 + 부호 방향 우선", () => {
    const s = mapSectorCategoryItem({
      bstp_cls_code: "0013",
      hts_kor_isnm: "전기·전자",
      bstp_nmix_prdy_ctrt: "3.4",
      prdy_vrss_sign: "2",
    });
    expect(s.code).toBe("0013");
    expect(s.name).toBe("전기·전자");
    expect(s.changePct).toBe(3.4);
    expect(s.direction).toBe("up");
    expect(s.total).toBe(0); // breadth 는 fan-out 이 채움
  });

  it("[#6] 음수 등락률 + 하락 부호, 업종명 없으면 코드 폴백", () => {
    const s = mapSectorCategoryItem({
      bstp_cls_code: "0005",
      bstp_nmix_prdy_ctrt: "-1.2",
      prdy_vrss_sign: "5",
    });
    expect(s.changePct).toBe(-1.2);
    expect(s.direction).toBe("down");
    expect(s.name).toBe("0005");
  });

  it("[#7] 부호 보합('3')이면 등락률 부호로 방향 폴백", () => {
    const up = mapSectorCategoryItem({
      bstp_cls_code: "0008",
      bstp_nmix_prdy_ctrt: "0.5",
      prdy_vrss_sign: "3",
    });
    expect(up.direction).toBe("up");
  });
});

describe("rankSectors (필터 + 정렬 + 상위 N)", () => {
  const raw: KisSectorCategoryItem[] = [
    { bstp_cls_code: "0002", hts_kor_isnm: "대형주", bstp_nmix_prdy_ctrt: "5.0" }, // 규모티어 제외
    { bstp_cls_code: "0013", hts_kor_isnm: "전기·전자", bstp_nmix_prdy_ctrt: "3.4" },
    { bstp_cls_code: "0009", hts_kor_isnm: "의약품", bstp_nmix_prdy_ctrt: "2.1" },
    { bstp_cls_code: "2180", hts_kor_isnm: "ESG", bstp_nmix_prdy_ctrt: "9.9" }, // 테마 제외
    { bstp_cls_code: "0005", hts_kor_isnm: "음식료·담배", bstp_nmix_prdy_ctrt: "-1.2" },
  ];

  it("[#8] 규모티어·테마 제외 후 등락률 내림차순", () => {
    const ranked = rankSectors(raw, 10);
    expect(ranked.map((s) => s.code)).toEqual(["0013", "0009", "0005"]);
  });

  it("[#9] 상위 N slice", () => {
    const ranked = rankSectors(raw, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].code).toBe("0013");
    expect(ranked[1].code).toBe("0009");
  });
});

describe("mapSectorConstituentItem", () => {
  it("[#10] stck_shrn_iscd·현재가·등락률 매핑, marketCap 초기 null", () => {
    const c = mapSectorConstituentItem({
      stck_shrn_iscd: "005930",
      hts_kor_isnm: "삼성전자",
      stck_prpr: "74800",
      prdy_ctrt: "3.1",
    });
    expect(c.ticker).toBe("005930");
    expect(c.name).toBe("삼성전자");
    expect(c.price).toBe(74_800);
    expect(c.changePct).toBe(3.1);
    expect(c.direction).toBe("up");
    expect(c.marketCap).toBeNull();
  });

  it("[#11] 누락 필드 방어 — 종목명 없으면 ticker, 숫자 0/flat", () => {
    const c = mapSectorConstituentItem({});
    expect(c.ticker).toBe("");
    expect(c.name).toBe("");
    expect(c.price).toBe(0);
    expect(c.direction).toBe("flat");
    expect(c.marketCap).toBeNull();
  });
});
