/**
 * `lib/api/coingecko/btc.ts` 의 `mapBtcQuote` 단위 테스트.
 *
 * PRD `header-market-ticker` AC-14 — BTC 매퍼 회귀 차단:
 *   1. krw → value, krw_24h_change → changePct 매핑.
 *   2. krw_24h_change 음수 → isUp false, 0/양수 → isUp true(보합 up 톤 흡수).
 *   3. krw 누락/비정상 → 에러 throw(BFF 가 BTC 만 mock degrade).
 */

import { describe, it, expect } from "vitest";
import { mapBtcQuote } from "../btc";
import { isApiError } from "@/lib/api/errors";

describe("mapBtcQuote", () => {
  it("[#1] krw → value, krw_24h_change → changePct", () => {
    const result = mapBtcQuote({
      bitcoin: { krw: 89_240_000, krw_24h_change: 1.23 },
    });
    expect(result).toEqual({
      value: 89_240_000,
      changePct: 1.23,
      isUp: true,
    });
  });

  it("[#2] krw_24h_change 음수 → isUp false", () => {
    const result = mapBtcQuote({
      bitcoin: { krw: 88_000_000, krw_24h_change: -0.5 },
    });
    expect(result.isUp).toBe(false);
    expect(result.changePct).toBe(-0.5);
  });

  it("[#2] krw_24h_change 0(보합) → isUp true(up 톤 흡수)", () => {
    const result = mapBtcQuote({
      bitcoin: { krw: 88_000_000, krw_24h_change: 0 },
    });
    expect(result.isUp).toBe(true);
  });

  it("krw_24h_change 누락 → changePct 0, isUp true", () => {
    const result = mapBtcQuote({ bitcoin: { krw: 88_000_000 } });
    expect(result.changePct).toBe(0);
    expect(result.isUp).toBe(true);
  });

  it("[#3] krw 누락 → ApiError throw", () => {
    let caught: unknown;
    try {
      mapBtcQuote({ bitcoin: {} });
    } catch (error) {
      caught = error;
    }
    expect(isApiError(caught)).toBe(true);
  });

  it("[#3] bitcoin 키 자체 누락 → ApiError throw", () => {
    let caught: unknown;
    try {
      mapBtcQuote({});
    } catch (error) {
      caught = error;
    }
    expect(isApiError(caught)).toBe(true);
  });
});
