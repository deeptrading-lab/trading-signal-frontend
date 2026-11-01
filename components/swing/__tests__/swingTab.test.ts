/** /swing 탭·시장 URL 매핑 회귀 차단. */

import { describe, expect, it } from "vitest";
import { swingFilterFromParam, swingMarketFromParam, swingTabHref } from "../swingTab";

describe("swingTab", () => {
  it("모르는 값은 기본(수급 조건 충족·전체 시장)", () => {
    expect(swingFilterFromParam(null)).toBe("flow");
    expect(swingFilterFromParam("garbage")).toBe("flow");
    expect(swingFilterFromParam("excluded")).toBe("excluded");
    expect(swingFilterFromParam("all")).toBe("all");
    expect(swingMarketFromParam("kospi")).toBeNull();
    expect(swingMarketFromParam("KOSDAQ")).toBe("KOSDAQ");
  });
  it("기본값은 쿼리 없이, 나머지만 표기", () => {
    expect(swingTabHref("/swing", "flow", null)).toBe("/swing");
    expect(swingTabHref("/swing", "excluded", null)).toBe("/swing?tab=excluded");
    expect(swingTabHref("/swing", "all", "KOSPI")).toBe("/swing?tab=all&market=KOSPI");
    expect(swingTabHref("/swing", "flow", "KOSDAQ")).toBe("/swing?market=KOSDAQ");
  });
});
