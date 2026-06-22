/**
 * 자가교정 프롬프트 주입 플래그 — 기본 OFF 계약 단위 테스트.
 *
 * PRD `scorecard-feedback` §(나). 미설정/그 외 값 = OFF(무회귀), "1"·"true"·"on" 만 ON.
 */

import { describe, it, expect, afterEach } from "vitest";
import { isScorecardFeedbackPromptEnabled } from "@/lib/server/scorecard/constants";

const KEY = "SCORECARD_FEEDBACK_PROMPT";

afterEach(() => {
  delete process.env[KEY];
});

describe("isScorecardFeedbackPromptEnabled — 기본 OFF", () => {
  it("미설정이면 OFF", () => {
    delete process.env[KEY];
    expect(isScorecardFeedbackPromptEnabled()).toBe(false);
  });

  it.each(["1", "true", "TRUE", "on", "On", "  true  "])(
    "참 값 %s 이면 ON",
    (v) => {
      process.env[KEY] = v;
      expect(isScorecardFeedbackPromptEnabled()).toBe(true);
    },
  );

  it.each(["", "0", "false", "off", "yes", "enable", "no"])(
    "그 외 값 %s 이면 OFF(무회귀)",
    (v) => {
      process.env[KEY] = v;
      expect(isScorecardFeedbackPromptEnabled()).toBe(false);
    },
  );
});
