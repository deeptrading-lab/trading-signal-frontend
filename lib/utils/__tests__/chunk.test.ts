import { describe, expect, it } from "vitest";
import { chunk } from "@/lib/utils/chunk";

describe("chunk", () => {
  it("빈 배열은 빈 배열로 유지한다", () => {
    expect(chunk([], 30)).toEqual([]);
  });

  it("size 이하이면 통째로 한 덩이", () => {
    expect(chunk([1, 2, 3], 30)).toEqual([[1, 2, 3]]);
  });

  it("size 로 나누되 원소 순서·개수를 보존한다", () => {
    const items = Array.from({ length: 65 }, (_, i) => i);
    const result = chunk(items, 30);
    expect(result.map((c) => c.length)).toEqual([30, 30, 5]);
    expect(result.flat()).toEqual(items);
  });

  it("경계값 — 정확히 나누어떨어지면 마지막 덩이도 꽉 찬다", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("size ≤ 0 이면 통째로 한 덩이(무한루프 방지)", () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    expect(chunk([1, 2, 3], -5)).toEqual([[1, 2, 3]]);
  });
});
