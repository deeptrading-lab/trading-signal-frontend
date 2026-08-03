import { describe, expect, it } from "vitest";
import { buildMistakeNoteContext } from "@/lib/server/paperTrading/mistakeNoteContext";

// ⚠️ UNTIL 은 만료 필터(오늘 KST 이후만 통과) 대상이라 고정 과거 날짜를 쓰면 그날 이후 테스트가
//    시한폭탄처럼 깨진다(실제로 2026-08-01 하드코딩이 8/2부터 실패). 만료 검증은 아래 전용 케이스가
//    맡고, 일반 케이스는 만료와 무관하도록 먼 미래를 쓴다.
const FUTURE = "2999-12-31";
const memory = `# CM
<!-- AI_CONTEXT_START -->
- S:ACTIVE | R:A | T:ENTRY | IF:저항 | DO:대기 | AVOID:추격 | E:d=3 | UNTIL:${FUTURE} | kw:저항
- S:SHADOW | R:B | T:EXIT | IF:둔화 | DO:재평가 | AVOID:스톱의존 | E:d=1 | UNTIL:${FUTURE} | kw:청산
- S:RETIRED | R:C | T:ENTRY | IF:x | DO:y | AVOID:z | E:d=9 | UNTIL:${FUTURE} | kw:x
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

  it("UNTIL 이 지난 규칙은 만료로 제외한다 — UNTIL 없는 규칙은 무기한 유지", () => {
    const expired = `# CM
<!-- AI_CONTEXT_START -->
- S:ACTIVE | R:OLD | T:ENTRY | IF:저항 | DO:대기 | AVOID:추격 | E:d=3 | UNTIL:2000-01-01 | kw:저항
- S:ACTIVE | R:PERM | T:ENTRY | IF:저항 | DO:대기 | AVOID:추격 | E:d=3 | kw:저항
<!-- AI_CONTEXT_END -->`;
    const result = buildMistakeNoteContext(expired, ["ENTRY"]);
    expect(result).not.toContain("R:OLD");
    expect(result).toContain("R:PERM");
  });
});
