/**
 * `readDataSource` 단위 — axios 응답 헤더에서 `X-Data-Source` 표면화(PRD §3-0).
 *
 * 알려진 소스만 통과, 미지/부재/비문자열은 undefined(판정 측 안전 실패). axios 소문자 키 정합.
 */

import { describe, it, expect } from "vitest";
import { readDataSource } from "@/lib/utils/dataSource";

describe("readDataSource — X-Data-Source 헤더 표면화", () => {
  it("알려진 소스 문자열을 그대로 union 으로 반환", () => {
    expect(readDataSource({ "x-data-source": "kis" })).toBe("kis");
    expect(readDataSource({ "x-data-source": "mock" })).toBe("mock");
    expect(readDataSource({ "x-data-source": "mock-timeout" })).toBe("mock-timeout");
    expect(readDataSource({ "x-data-source": "mock-empty" })).toBe("mock-empty");
    expect(readDataSource({ "x-data-source": "mock-error" })).toBe("mock-error");
    expect(readDataSource({ "x-data-source": "kv" })).toBe("kv");
  });

  it("배열 헤더는 첫 값 사용", () => {
    expect(readDataSource({ "x-data-source": ["kis", "mock"] })).toBe("kis");
  });

  it("미지/부재/비문자열은 undefined", () => {
    expect(readDataSource({ "x-data-source": "unknown-src" })).toBeUndefined();
    expect(readDataSource({})).toBeUndefined();
    expect(readDataSource(undefined)).toBeUndefined();
    expect(readDataSource(null)).toBeUndefined();
    expect(readDataSource("not-an-object")).toBeUndefined();
    expect(readDataSource({ "x-data-source": 42 })).toBeUndefined();
  });
});
