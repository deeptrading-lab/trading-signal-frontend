import { accessSync, constants } from "node:fs";
import { delimiter, join, isAbsolute } from "node:path";

/** macOS 데스크톱 앱에 번들된 Codex CLI 경로 — 독립 Codex 앱과 ChatGPT 통합 앱을 모두 지원. */
const CODEX_APP_BUNDLE_CLIS = [
  "/Applications/Codex.app/Contents/Resources/codex",
  "/Applications/ChatGPT.app/Contents/Resources/codex",
] as const;

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * `bin` 이 경로 구분자를 포함하면(절대/상대 경로) 그 경로를 직접 검사하고,
 * 단순 명령어면 `PATH` 의 각 디렉터리에서 실행 가능 파일을 탐색한다.
 */
export function binaryAvailable(bin: string): boolean {
  if (!bin) return false;
  if (isAbsolute(bin) || bin.includes("/")) {
    return isExecutable(bin);
  }
  const pathEnv = process.env.PATH ?? "";
  return pathEnv
    .split(delimiter)
    .filter(Boolean)
    .some((dir) => isExecutable(join(dir, bin)));
}

export function resolveClaudeCliPath(): string {
  return process.env.CLAUDE_CLI_PATH ?? "claude";
}

export function resolveCodexCliPath(): string {
  if (process.env.CODEX_CLI_PATH?.trim()) return process.env.CODEX_CLI_PATH;
  if (binaryAvailable("codex")) return "codex";
  const bundledCli = CODEX_APP_BUNDLE_CLIS.find(binaryAvailable);
  if (bundledCli) return bundledCli;
  return "codex";
}
