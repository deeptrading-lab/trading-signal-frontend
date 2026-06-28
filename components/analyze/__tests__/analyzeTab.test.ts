/** /analyze 탭 URL 매핑(analyzeTabFromParam/analyzeTabHref) 회귀 차단. */

import { describe, it, expect } from "vitest";
import {
  analyzeTabFromParam,
  analyzeTabHref,
  DEFAULT_ANALYZE_TAB,
} from "../analyzeTab";

describe("analyzeTabFromParam", () => {
  it("usage 는 usage 로", () => {
    expect(analyzeTabFromParam("usage")).toBe("usage");
  });
  it("results·미지정·오타는 모두 기본(results)", () => {
    expect(analyzeTabFromParam("results")).toBe("results");
    expect(analyzeTabFromParam(null)).toBe("results");
    expect(analyzeTabFromParam(undefined)).toBe("results");
    expect(analyzeTabFromParam("garbage")).toBe("results");
    expect(DEFAULT_ANALYZE_TAB).toBe("results");
  });
});

describe("analyzeTabHref", () => {
  it("results 는 쿼리 없는 경로", () => {
    expect(analyzeTabHref("/analyze", "results")).toBe("/analyze");
  });
  it("usage 는 ?tab=usage", () => {
    expect(analyzeTabHref("/analyze", "usage")).toBe("/analyze?tab=usage");
  });
});
