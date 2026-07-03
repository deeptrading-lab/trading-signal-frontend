/**
 * `mapFluctuationItem` / `rankSortCodeForDirection` 단위 테스트.
 *
 * 등락률 순위(급상승/급하락) 매퍼 + 방향 파라미터 매핑 회귀 차단:
 *   1. 방향 → fid_rank_sort_cls_code (up→"0" 상승율순 / down→"1" 하락율순).
 *   2. ⚠️ 종목코드는 `stck_shrn_iscd`(volume-rank 의 `mksc_shrn_iscd` 아님).
 *   3. 숫자 문자열 → number, 음수 부호 보존, 누락 필드 → 0/ticker 방어.
 *   4. direction 은 changePercent 부호 기준(표시 등락률과 일관).
 */

import { describe, it, expect } from "vitest";
import {
  mapFluctuationItem,
  rankSortCodeForDirection,
  type KisFluctuationItem,
} from "../fluctuation";

describe("rankSortCodeForDirection (방향 파라미터 매핑)", () => {
  it("[#1] up(급상승) → '0' 상승율순, down(급하락) → '1' 하락율순", () => {
    expect(rankSortCodeForDirection("up")).toBe("0");
    expect(rankSortCodeForDirection("down")).toBe("1");
  });
});

describe("mapFluctuationItem", () => {
  it("[#2] 종목코드는 stck_shrn_iscd 에서 추출(mksc_shrn_iscd 아님)", () => {
    const row = mapFluctuationItem({
      stck_shrn_iscd: "005930",
      hts_kor_isnm: "삼성전자",
      stck_prpr: "290500",
      prdy_ctrt: "12.4",
    });
    expect(row.ticker).toBe("005930");
    expect(row.name).toBe("삼성전자");
    expect(row.price).toBe(290_500);
    expect(row.changePercent).toBe(12.4);
    expect(row.direction).toBe("up");
  });

  it("[#3] 하락 종목 — 음수 등락률 부호 보존 + direction down", () => {
    const row = mapFluctuationItem({
      stck_shrn_iscd: "247540",
      hts_kor_isnm: "에코프로비엠",
      stck_prpr: "132900",
      prdy_ctrt: "-11.7",
      prdy_vrss_sign: "5",
    });
    expect(row.changePercent).toBe(-11.7);
    expect(row.direction).toBe("down");
  });

  it("[#4] 보합(0%) → direction flat", () => {
    const row = mapFluctuationItem({
      stck_shrn_iscd: "005380",
      hts_kor_isnm: "현대차",
      prdy_ctrt: "0",
    });
    expect(row.direction).toBe("flat");
  });

  it("[#4b] 누락 필드 → 0 방어, 종목명 없으면 ticker 폴백", () => {
    const row = mapFluctuationItem({ stck_shrn_iscd: "000660" });
    expect(row.name).toBe("000660"); // hts_kor_isnm 없으면 ticker.
    expect(row.price).toBe(0);
    expect(row.changePercent).toBe(0);
    expect(row.direction).toBe("flat");
  });

  it("[#4c] 종목코드까지 없으면 ticker 빈 문자열, name 도 빈 문자열", () => {
    const row = mapFluctuationItem({} as KisFluctuationItem);
    expect(row.ticker).toBe("");
    expect(row.name).toBe("");
  });
});
