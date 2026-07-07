import { accessSync, constants } from "node:fs";
import { delimiter, join, isAbsolute } from "node:path";

const CODEX_APP_BUNDLE_CLI = "/Applications/Codex.app/Contents/Resources/codex";

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
  if (binaryAvailable(CODEX_APP_BUNDLE_CLI)) return CODEX_APP_BUNDLE_CLI;
  return "codex";
}
