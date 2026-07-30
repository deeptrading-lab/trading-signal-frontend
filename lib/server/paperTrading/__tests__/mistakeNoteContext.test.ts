import { describe, expect, it } from "vitest";
import {
  buildMistakeNoteContext,
} from "@/lib/server/paperTrading/mistakeNoteContext";
import { buildRuntimeMemorySnapshot } from "../../../../packages/intraday-mistake-note/src/memory";

// ⚠️ UNTIL 은 만료 필터(오늘 KST 이후만 통과) 대상이라 고정 과거 날짜를 쓰면 그날 이후 테스트가
//    시한폭탄처럼 깨진다(실제로 2026-08-01 하드코딩이 8/2부터 실패). 만료 검증은 아래 전용 케이스가
//    맡고, 일반 케이스는 만료와 무관하도록 먼 미래를 쓴다.
const FUTURE = "2999-12-31";
const memory = `# CM
source-through:2026-07-30
<!-- AI_CONTEXT_START -->
- S:ACTIVE | R:AI-00000001 | T:ENTRY | IF:저항 | DO:대기 | AVOID:추격 | E:d=3 | UNTIL:${FUTURE} | kw:저항
- S:SHADOW | R:AI-00000002 | T:EXIT | IF:둔화 | DO:재평가 | AVOID:스톱의존 | E:d=1 | UNTIL:${FUTURE} | kw:청산
<!-- AI_CONTEXT_END -->`;

describe("buildMistakeNoteContext", () => {
  it("범위가 맞는 ACTIVE/SHADOW만 짧게 주입한다", () => {
    const result = buildMistakeNoteContext(memory, ["ENTRY"]);
    expect(result).toContain("AI-00000001");
    expect(result).not.toContain("AI-00000002");
    expect(result).toContain("필수참고");
    expect(result).toContain("안전핀 유지");
    expect(result.length).toBeLessThanOrEqual(160);
  });

  it("문자 예산을 넘는 규칙은 제외한다", () => {
    expect(buildMistakeNoteContext(memory, [], 6, 40)).toBe("");
  });

  it("마커가 없으면 fail-soft 빈 문맥이다", () => {
    expect(buildMistakeNoteContext("# 없음")).toBe("");
  });

  it("UNTIL 이 지난 규칙은 만료로 제외한다", () => {
    const expired = `# CM
source-through:2026-07-30
<!-- AI_CONTEXT_START -->
- S:ACTIVE | R:AI-00000003 | T:ENTRY | IF:저항 | DO:대기 | AVOID:추격 | E:d=3 | UNTIL:2000-01-01 | kw:저항
- S:ACTIVE | R:AI-00000004 | T:ENTRY | IF:눌림 | DO:재확인 | AVOID:추격 | E:d=3 | UNTIL:${FUTURE} | kw:눌림
<!-- AI_CONTEXT_END -->`;
    const result = buildMistakeNoteContext(expired, ["ENTRY"]);
    expect(result).not.toContain("AI-00000003");
    expect(result).toContain("AI-00000004");
  });

  it("형식이 오염된 규칙은 전체 문맥을 INVALID로 제외한다", () => {
    const polluted = memory.replace("R:AI-00000001", "R:AI-00000001 | T:EXIT");
    expect(buildRuntimeMemorySnapshot(polluted).status).toBe("INVALID");
    expect(buildMistakeNoteContext(polluted)).toBe("");
  });

  it("적용된 CM 해시·원천일·규칙 ID를 감사 정보로 제공한다", () => {
    const result = buildRuntimeMemorySnapshot(memory, ["ENTRY"]);
    expect(result).toMatchObject({
      status: "PRESENTED",
      ruleIds: ["AI-00000001"],
      sourceThrough: "2026-07-30",
    });
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("호출자가 지정한 scope 순서대로 최우선 규칙을 고른다", () => {
    expect(buildRuntimeMemorySnapshot(memory, ["EXIT", "ENTRY"]).ruleIds).toEqual([
      "AI-00000002",
    ]);
    expect(buildRuntimeMemorySnapshot(memory, ["ENTRY", "EXIT"]).ruleIds).toEqual([
      "AI-00000001",
    ]);
  });

  it("source-through:none은 손상이 아닌 EMPTY다", () => {
    const empty = `# CM
source-through:none
<!-- AI_CONTEXT_START -->
<!-- AI_CONTEXT_END -->`;
    expect(buildRuntimeMemorySnapshot(empty)).toMatchObject({
      status: "EMPTY",
      context: "",
      sourceThrough: null,
    });
  });
});
