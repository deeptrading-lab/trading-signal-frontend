/**
 * stripMarkdown / stripStrikethrough — 취소선 자기수정 흔적 제거 단위 테스트.
 *
 * 핵심 계약:
 * - `~~old~~new` → `new` (old 는 마커째 통째로 제거, new 는 유지).
 * - 한 줄에 취소선이 여러 번 나와도 전부 제거.
 * - 취소선 없는 원문은 그대로 유지.
 * - `stripMarkdown`(teaser 평문화)도 같은 취소선 제거를 거친다.
 */

import { describe, it, expect } from "vitest";
import { stripMarkdown, stripStrikethrough } from "@/lib/utils/stripMarkdown";

describe("stripStrikethrough", () => {
  it("`~~old~~new` 에서 old 를 마커째 제거하고 new 만 남긴다", () => {
    expect(stripStrikethrough("~~220,000~~230,000원")).toBe("230,000원");
  });

  it("한 줄에 여러 번 나와도 전부 제거한다", () => {
    expect(
      stripStrikethrough("단기(~~1~~2주): ~~220,000~~230,000원 = +~~5~~10%"),
    ).toBe("단기(2주): 230,000원 = +10%");
  });

  it("취소선이 없으면 원문 그대로 반환한다", () => {
    expect(stripStrikethrough("영업이익 +120.4% YoY")).toBe(
      "영업이익 +120.4% YoY",
    );
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(stripStrikethrough("")).toBe("");
  });
});

describe("stripMarkdown 취소선 처리", () => {
  it("teaser 평문화 시에도 취소선 흔적이 사라진다", () => {
    expect(stripMarkdown("**손절**: ~~190,000~~200,000원 이탈 시 청산")).toBe(
      "손절: 200,000원 이탈 시 청산",
    );
  });
});
