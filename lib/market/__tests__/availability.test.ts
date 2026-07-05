/**
 * 가용성 판정(`resolveAvailability`) 단위 — PRD `market-status-aware-home` §6 매트릭스.
 *
 * available/unavailable/loading 매핑을 소스·isError·isLoading 조합으로 고정한다. dev mock 이
 * available 인지(§6 q1, 영구 점검중 회귀 방지)와 never-throw mock-* / 502 가 unavailable 인지 검증.
 */

import { describe, it, expect } from "vitest";
import { resolveAvailability, isAvailable } from "@/lib/market/availability";
import type { DataSource } from "@/lib/types/market/dataSource";

const settled = (dataSource: DataSource | undefined, isError = false) => ({
  isLoading: false,
  isError,
  dataSource,
});

describe("resolveAvailability — 가용성 3-상태 매핑", () => {
  it("loading 은 settled 전 최우선(점검 오판 방지)", () => {
    expect(
      resolveAvailability({ isLoading: true, isError: false, dataSource: undefined }),
    ).toBe("loading");
    // isError/소스가 있어도 로딩이면 loading 우선.
    expect(
      resolveAvailability({ isLoading: true, isError: true, dataSource: "kis" }),
    ).toBe("loading");
  });

  it("kis 성공 = available", () => {
    expect(resolveAvailability(settled("kis"))).toBe("available");
  });

  it("dev mock(미설정) = available — 영구 점검중 회귀 방지(§6 q1)", () => {
    expect(resolveAvailability(settled("mock"))).toBe("available");
  });

  it("mock-timeout / mock-empty / mock-error = unavailable(never-throw 계열)", () => {
    expect(resolveAvailability(settled("mock-timeout"))).toBe("unavailable");
    expect(resolveAvailability(settled("mock-empty"))).toBe("unavailable");
    expect(resolveAvailability(settled("mock-error"))).toBe("unavailable");
  });

  it("isError(502 throw) = unavailable — 소스 없어도 HTTP 상태만으로", () => {
    expect(resolveAvailability(settled(undefined, true))).toBe("unavailable");
    // 502 는 소스 헤더가 없을 수 있다(에러 응답).
    expect(resolveAvailability(settled("kis", true))).toBe("unavailable");
  });

  it("소스 미지(undefined) + 에러 아님 = unavailable(안전 실패)", () => {
    expect(resolveAvailability(settled(undefined))).toBe("unavailable");
  });

  it("isAvailable 편의 — available 만 true, loading 은 false", () => {
    expect(isAvailable(settled("kis"))).toBe(true);
    expect(isAvailable(settled("mock"))).toBe(true);
    expect(isAvailable(settled("mock-error"))).toBe(false);
    expect(
      isAvailable({ isLoading: true, isError: false, dataSource: undefined }),
    ).toBe(false);
  });
});
