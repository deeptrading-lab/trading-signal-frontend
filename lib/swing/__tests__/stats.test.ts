import { describe, it, expect } from "vitest";
import stats from "../stats-v1.json";
import { RULEBOOK } from "../rulebook";

/**
 * 과거 통계 가드 — `stats-v1.json` 은 `audit.mts stats V1` 이 만든다(사전 등록 §4).
 * 규칙서 값을 바꾸면 이 테스트가 깨진다 → 새 버전·새 사전 등록·새 통계가 필요하다는 신호.
 */
describe("stats-v1.json", () => {
  it("현재 RULEBOOK 으로 만든 통계다", () => {
    expect(stats.rulebook).toEqual(RULEBOOK);
  });

  it("출시 형태 = 사전 등록 결정표 결과(발견 미달 → 두 시장 체크리스트)", () => {
    expect(stats.decision.discovery).toBe("미달");
    expect(stats.release).toEqual({ KOSPI: "checklist", KOSDAQ: "checklist" });
  });

  it("n < 30 셀은 숨김 표시가 붙는다", () => {
    for (const c of stats.cells) expect(c.hidden).toBe(c.n < 30);
  });

  it("등급 셀이 시장(ALL·KOSPI·KOSDAQ) × 등급 4종으로 빠짐없이 있다", () => {
    for (const market of ["ALL", "KOSPI", "KOSDAQ"]) {
      for (const grade of ["candidate", "interest", "neutral", "excluded"]) {
        expect(stats.cells.some((c) => c.kind === "grade" && c.grade === grade && c.market === market && c.year === "ALL")).toBe(true);
      }
    }
  });
});
