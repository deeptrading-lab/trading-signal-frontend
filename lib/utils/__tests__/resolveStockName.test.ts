import { describe, it, expect } from "vitest";
import { pickStockName } from "../resolveStockName";

describe("pickStockName", () => {
  it("후보 순서대로 첫 번째 유효값을 고른다", () => {
    expect(pickStockName("005930", ["삼성전자", "Samsung"])).toBe("삼성전자");
  });

  it("빈 값(null/undefined/'')은 건너뛴다", () => {
    expect(pickStockName("005930", [null, undefined, "", "삼성전자"])).toBe(
      "삼성전자",
    );
  });

  it("ticker 와 동일한 후보는 표시명으로 쓰지 않는다", () => {
    expect(pickStockName("005930", ["005930", "삼성전자"])).toBe("삼성전자");
  });

  it("적합한 후보가 없으면 null (호출부가 ticker 폴백 결정)", () => {
    expect(pickStockName("005930", [null, undefined, "005930"])).toBeNull();
    expect(pickStockName("005930", [])).toBeNull();
  });
});
