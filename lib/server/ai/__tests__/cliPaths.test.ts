import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  accessSync: vi.fn(),
  constants: { X_OK: 1 },
}));

import { accessSync } from "node:fs";
import { resolveCodexCliPath } from "@/lib/server/ai/cliPaths";

const ORIGINAL_ENV = { ...process.env };
const mockedAccessSync = vi.mocked(accessSync);

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  mockedAccessSync.mockReset();
});

describe("resolveCodexCliPath", () => {
  it("환경변수 경로를 가장 먼저 사용한다", () => {
    process.env.CODEX_CLI_PATH = "/custom/codex";

    expect(resolveCodexCliPath()).toBe("/custom/codex");
  });

  it("PATH에 없으면 ChatGPT 앱에 번들된 Codex CLI를 찾는다", () => {
    delete process.env.CODEX_CLI_PATH;
    process.env.PATH = "/usr/bin";
    mockedAccessSync.mockImplementation((path) => {
      if (String(path) !== "/Applications/ChatGPT.app/Contents/Resources/codex") {
        throw new Error("not found");
      }
    });

    expect(resolveCodexCliPath()).toBe(
      "/Applications/ChatGPT.app/Contents/Resources/codex",
    );
  });
});
