/**
 * `mapIntstockMultprice` 단위 테스트.
 *
 * PRD `watchlist-batch-quotes` AC-5 — 일괄 매퍼 + 업종명/종목명 회귀 차단:
 *   1. 등락 부호 → direction 매핑(up/down/flat).
 *   2. 숫자 문자열 → number, 누락 필드 → 0/undefined 방어.
 *   3. ⚠️ `inter_kor_isnm`(관심 종목명)·`bstp_kor_isnm`(업종명)을 name 에 대입하지 않음(name = ticker).
 */

import { describe, it, expect } from "vitest";
import { mapIntstockMultprice } from "../mappers";
import type { KisIntstockMultpriceItem } from "../types";

describe("mapIntstockMultprice (AC-5)", () => {
  it("[#1] 전일대비 부호 → direction 매핑 (상승/하락/보합)", () => {
    const up = mapIntstockMultprice({ prdy_vrss_sign: "2" }, "005930");
    const down = mapIntstockMultprice({ prdy_vrss_sign: "5" }, "000660");
    const flat = mapIntstockMultprice({ prdy_vrss_sign: "3" }, "035420");
    expect(up.direction).toBe("up");
    expect(down.direction).toBe("down");
    expect(flat.direction).toBe("flat");
  });

  it("[#2] 숫자 문자열 → number, 음수 부호 보존", () => {
    const q = mapIntstockMultprice(
      {
        inter2_prpr: "71500",
        inter2_prdy_vrss: "-2700",
        prdy_ctrt: "-1.52",
        acml_vol: "12345678",
        inter2_oprc: "70000",
        inter2_hgpr: "72000",
        inter2_lwpr: "69500",
      },
      "005930",
    );
    expect(q.price).toBe(71_500);
    expect(q.change).toBe(-2_700);
    expect(q.changePercent).toBe(-1.52);
    expect(q.volume).toBe(12_345_678);
    expect(q.open).toBe(70_000);
    expect(q.high).toBe(72_000);
    expect(q.low).toBe(69_500);
  });

  it("[#2b] 누락 필드 → 0 / undefined 방어", () => {
    const q = mapIntstockMultprice({}, "005930");
    expect(q.price).toBe(0);
    expect(q.change).toBe(0);
    expect(q.changePercent).toBe(0);
    expect(q.volume).toBe(0);
    expect(q.direction).toBe("flat");
    expect(q.open).toBeUndefined();
    expect(q.high).toBeUndefined();
    expect(q.low).toBeUndefined();
  });

  it("[#3] inter_kor_isnm(관심 종목명) 이 와도 name 에 쓰지 않음 → name = ticker", () => {
    const item = {
      inter_kor_isnm: "삼성전자",
      inter2_prpr: "71500",
    } as KisIntstockMultpriceItem;
    const q = mapIntstockMultprice(item, "005930");
    expect(q.name).toBe("005930"); // 종목명 미사용, ticker 식별값.
    expect(q.name).not.toBe("삼성전자");
  });
});
