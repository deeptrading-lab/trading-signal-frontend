/**
 * `mapVolumeRankItem` / `blngClsCodeForMode` 단위 테스트.
 *
 * 거래량/거래대금 순위 매퍼 + 정렬 기준 파라미터 매핑 회귀 차단:
 *   1. 정렬 기준 → FID_BLNG_CLS_CODE (volume→"0" 평균거래량 / value→"3" 거래금액순).
 *   2. ⚠️ 종목코드는 `mksc_shrn_iscd`(fluctuation 의 `stck_shrn_iscd` 아님).
 *   3. 숫자 문자열 → number, 음수 부호 보존, direction 은 changePercent 부호 기준.
 *   4. `acml_tr_pbmn` → tradingValue(원값 통과), 없으면 undefined(무회귀 — 기존 volume 소비자).
 */

import { describe, it, expect } from "vitest";
import {
  mapVolumeRankItem,
  blngClsCodeForMode,
  type KisVolumeRankItem,
} from "../volume-rank";

describe("blngClsCodeForMode (정렬 기준 파라미터 매핑)", () => {
  it("[#1] volume → '0' 평균거래량, value → '3' 거래금액순", () => {
    expect(blngClsCodeForMode("volume")).toBe("0");
    expect(blngClsCodeForMode("value")).toBe("3");
  });
});

describe("mapVolumeRankItem", () => {
  it("[#2] 종목코드는 mksc_shrn_iscd 에서 추출 + 필드 매핑", () => {
    const row = mapVolumeRankItem({
      mksc_shrn_iscd: "005930",
      hts_kor_isnm: "삼성전자",
      stck_prpr: "290500",
      prdy_ctrt: "1.2",
      acml_vol: "18234567",
    });
    expect(row.ticker).toBe("005930");
    expect(row.name).toBe("삼성전자");
    expect(row.price).toBe(290_500);
    expect(row.changePercent).toBe(1.2);
    expect(row.direction).toBe("up");
    expect(row.volume).toBe(18_234_567);
  });

  it("[#3] 음수 등락률 부호 보존 + direction down", () => {
    const row = mapVolumeRankItem({
      mksc_shrn_iscd: "042660",
      prdy_ctrt: "-1.4",
      acml_vol: "7882110",
    });
    expect(row.changePercent).toBe(-1.4);
    expect(row.direction).toBe("down");
  });

  it("[#4] acml_tr_pbmn 있으면 tradingValue 로 원값 통과", () => {
    const row = mapVolumeRankItem({
      mksc_shrn_iscd: "000660",
      acml_vol: "9120345",
      acml_tr_pbmn: "3757582000000",
    });
    expect(row.tradingValue).toBe(3_757_582_000_000);
  });

  it("[#4b] acml_tr_pbmn 없으면 tradingValue 키 자체가 없음(무회귀 — 기존 volume 소비자)", () => {
    const row = mapVolumeRankItem({
      mksc_shrn_iscd: "005930",
      acml_vol: "18234567",
    });
    expect(row.tradingValue).toBeUndefined();
    expect("tradingValue" in row).toBe(false);
  });

  it("[#4c] 누락 필드 → 0/flat 방어, 종목명 없으면 ticker 폴백", () => {
    const row = mapVolumeRankItem({} as KisVolumeRankItem);
    expect(row.ticker).toBe("");
    expect(row.name).toBe("");
    expect(row.price).toBe(0);
    expect(row.volume).toBe(0);
    expect(row.direction).toBe("flat");
  });
});
