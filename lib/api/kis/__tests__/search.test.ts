/**
 * `lib/api/kis/search.ts` — getSymbolName 시드 역참조 회귀 테스트.
 *
 * UI 점검(2026-05-30) #2 — 디그레이드 행 종목명 fallback(추가 시점 store name 없을 때 보조).
 * 시드 수록 종목은 종목명을, 미수록 종목은 null 을 반환해야 한다.
 */

import { describe, it, expect } from "vitest";
import { getSymbolName, searchSymbols } from "@/lib/api/kis/search";

describe("getSymbolName", () => {
  it("시드 수록 ticker 는 종목명 반환", () => {
    // 삼성전자는 시드(symbols.json) 대표주 — 검색 결과로 존재 확인 후 역참조 일치 검증.
    const samsung = searchSymbols("005930")[0];
    expect(samsung).toBeDefined();
    expect(getSymbolName("005930")).toBe(samsung!.name);
  });

  it("시드 미수록 ticker 는 null", () => {
    expect(getSymbolName("999999")).toBeNull();
  });
});
