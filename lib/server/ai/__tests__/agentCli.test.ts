import { afterEach, describe, expect, it } from "vitest";
import {
  buildAgentCliInvocation,
  extractAgentCliText,
} from "@/lib/server/ai/agentCli";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("buildAgentCliInvocation", () => {
  it("Claude 웹 검색 도구와 모델을 기존 CLI 계약으로 전달한다", () => {
    process.env.CLAUDE_CLI_PATH = "/opt/claude";
    process.env.CLAUDE_CLI_MODEL = "sonnet";

    const result = buildAgentCliInvocation({
      provider: "claude",
      systemPrompt: "system",
      userPrompt: "user",
      webSearch: true,
    });

    expect(result.bin).toBe("/opt/claude");
    expect(result.args).toContain("--print");
    expect(result.args).toContain("WebSearch,WebFetch");
    expect(result.args).toContain("sonnet");
    expect(result.stdin).toBe("user");
  });

  it("Codex를 읽기 전용 비대화형 임시 세션으로 실행한다", () => {
    process.env.CODEX_CLI_PATH = "/opt/codex";
    process.env.CODEX_CLI_MODEL = "gpt-5.4";

    const result = buildAgentCliInvocation({
      provider: "codex",
      systemPrompt: "한국 주식 분석가",
      userPrompt: "005930을 분석하세요.",
      webSearch: true,
    });

    expect(result.bin).toBe("/opt/codex");
    expect(result.args).toEqual(expect.arrayContaining([
      "--disable", "plugins",
      "--disable", "apps",
      "--cd", "/tmp",
      "--search",
      "--sandbox", "read-only",
      "--ask-for-approval", "never",
      "--model", "gpt-5.4",
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--skip-git-repo-check",
      "--color", "never",
      "-",
    ]));
    expect(result.stdin).toContain("[역할 및 최우선 지침]");
    expect(result.stdin).toContain("파일을 읽거나 수정하지 말고");
    expect(result.stdin).toContain("005930을 분석하세요.");
  });

  it("웹 조사가 필요 없는 Codex 에이전트에는 search를 활성화하지 않는다", () => {
    const result = buildAgentCliInvocation({
      provider: "codex",
      systemPrompt: "system",
      userPrompt: "user",
      webSearch: false,
    });

    expect(result.args).not.toContain("--search");
  });
});

describe("extractAgentCliText", () => {
  it("Claude JSON envelope의 result를 추출한다", () => {
    expect(extractAgentCliText("claude", '{"result":"분석 결과"}')).toBe("분석 결과");
  });

  it("Codex stdout은 최종 응답 그대로 사용한다", () => {
    expect(extractAgentCliText("codex", "  분석 결과\n")).toBe("분석 결과");
  });
});
