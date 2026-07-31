/**
 * AI 판정 레벨 라벨 회귀.
 *
 * 배경: 같은 매핑이 차트 축 라벨(2곳)·판정 스트립에 하드코딩돼 있어 문구가 갈라질 수 있었고,
 * 실제로 쓰던 "무효화" 는 **무슨 뜻인지 바로 읽히지 않는다**는 피드백을 받아 "재검토" 로 바꿨다.
 * 여기서 고정하는 것은 (1) 매핑이 한 곳에서만 나온다는 것과 (2) 폐기한 용어가 다시 새어나오지 않는 것.
 */

import { describe, it, expect } from "vitest";
import { AI_LEVEL_ROLE_LABEL, COPY } from "@/lib/copy/stock/aiAnalysis";
import { THESIS_INVALIDATED, THESIS_STOP_HIT, thesisBreachTitle } from "@/lib/copy/analyze/labels";

/** 화면에서 물러난 용어 — 코드 내부 개념어(role: "invalidation")로는 계속 쓰되 사람이 읽는 말엔 금지. */
const RETIRED = "무효화";

describe("AI_LEVEL_ROLE_LABEL", () => {
  it("네 역할 모두 라벨이 있다", () => {
    expect(Object.keys(AI_LEVEL_ROLE_LABEL).sort()).toEqual(
      ["invalidation", "reentry", "stop", "target"].sort(),
    );
  });

  it("라벨은 비어 있지 않고 서로 겹치지 않는다", () => {
    const values = Object.values(AI_LEVEL_ROLE_LABEL);
    for (const v of values) expect(v.trim().length).toBeGreaterThan(0);
    expect(new Set(values).size).toBe(values.length);
  });

  it("약세 상방 라인은 '재검토'로 읽힌다(강세 하방은 '손절' 유지)", () => {
    expect(AI_LEVEL_ROLE_LABEL.invalidation).toBe("재검토");
    expect(AI_LEVEL_ROLE_LABEL.stop).toBe("손절");
  });
});

describe("폐기 용어가 사용자 문구에 다시 들어오지 않는다", () => {
  it("레벨 라벨", () => {
    for (const v of Object.values(AI_LEVEL_ROLE_LABEL)) expect(v).not.toContain(RETIRED);
  });

  it("판정 패널·재분석 배너", () => {
    expect(COPY.verdict.invalidationLabel).not.toContain(RETIRED);
    for (const v of Object.values(COPY.savedMode.staleReason)) {
      expect(v).not.toContain(RETIRED);
    }
  });

  it("카드 배지와 마우스오버 문구", () => {
    expect(THESIS_INVALIDATED).not.toContain(RETIRED);
    expect(THESIS_STOP_HIT).not.toContain(RETIRED);
    expect(thesisBreachTitle("invalidation", "353,927", 10.9)).not.toContain(RETIRED);
    expect(thesisBreachTitle("stop", "285,000", 8.2)).not.toContain(RETIRED);
  });
});
