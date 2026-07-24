import { describe, expect, it } from "vitest";
import { buildMistakeNoteContext } from "@/lib/server/paperTrading/mistakeNoteContext";

const memory = `# CM
<!-- AI_CONTEXT_START -->
- S:ACTIVE | R:A | T:ENTRY | IF:저항 | DO:대기 | AVOID:추격 | E:d=3 | UNTIL:2026-08-01 | kw:저항
- S:SHADOW | R:B | T:EXIT | IF:둔화 | DO:재평가 | AVOID:스톱의존 | E:d=1 | UNTIL:2026-08-01 | kw:청산
- S:RETIRED | R:C | T:ENTRY | IF:x | DO:y | AVOID:z | E:d=9 | UNTIL:2026-08-01 | kw:x
<!-- AI_CONTEXT_END -->`;

describe("buildMistakeNoteContext", () => {
  it("범위가 맞는 ACTIVE/SHADOW만 짧게 주입한다", () => {
    const result = buildMistakeNoteContext(memory, ["ENTRY"]);
    expect(result).toContain("R:A");
    expect(result).not.toContain("R:B");
    expect(result).not.toContain("R:C");
    expect(result).toContain("안전핀 완화 금지");
  });

  it("문자 예산을 넘는 규칙은 제외한다", () => {
    expect(buildMistakeNoteContext(memory, [], 6, 80)).toBe("");
  });

  it("마커가 없으면 fail-soft 빈 문맥이다", () => {
    expect(buildMistakeNoteContext("# 없음")).toBe("");
  });
});
