/**
 * 시가총액 컴팩트 포맷터 — 조/억 표기·경계·fail-soft 단위 테스트.
 */

import { describe, it, expect } from "vitest";
import { formatMarketCap } from "@/lib/utils/formatMarketCap";

describe("formatMarketCap", () => {
  it("1조 이상 100조 미만은 조 단위(소수 1자리)", () => {
    expect(formatMarketCap(90_900_000_000_000)).toBe("90.9조");
    expect(formatMarketCap(2_190_000_000_000)).toBe("2.2조");
  });

  it("100조 이상은 정수 조", () => {
    expect(formatMarketCap(299_900_000_000_000)).toBe("300조");
    expect(formatMarketCap(173_400_000_000_000)).toBe("173조");
  });

  it("1조 미만은 억 단위(정수·콤마)", () => {
    expect(formatMarketCap(845_000_000_000)).toBe("8,450억");
    expect(formatMarketCap(30_000_000_000)).toBe("300억");
  });

  it("10억 미만은 억 소수 1자리(0억 뭉개짐 방지)", () => {
    expect(formatMarketCap(550_000_000)).toBe("5.5억");
  });

  it("null·undefined·NaN·0·음수는 '-'(fail-soft)", () => {
    expect(formatMarketCap(null)).toBe("-");
    expect(formatMarketCap(undefined)).toBe("-");
    expect(formatMarketCap(Number.NaN)).toBe("-");
    expect(formatMarketCap(0)).toBe("-");
    expect(formatMarketCap(-1000)).toBe("-");
  });
});
