/**
 * 로컬에 설치된 AI CLI(claude·codex) 가용성 감지.
 *
 * AI 멀티에이전트 분석은 로컬 CLI 를 셸 호출하는 기능이라, 진입 화면(ProviderChooser)에서 어떤
 * 공급자가 실제로 실행 가능한지 미리 보여주기 위해 사용한다. 프로세스를 spawn 하지 않고 PATH(또는
 * 절대/상대 경로)에 실행 가능한 바이너리가 있는지 파일시스템으로만 확인 → 빠르고 부작용 없음.
 *
 * 감지 기준 바이너리 경로는 실제 호출 경로(`lib/server/ai/agentCli.ts`)와 동일한 env 기본값을
 * 사용한다(`CLAUDE_CLI_PATH ?? "claude"`, `CODEX_CLI_PATH ?? "codex"`) — 감지 결과와 실행
 * 가능 여부가 어긋나지 않도록.
 */

import {
  binaryAvailable,
  resolveClaudeCliPath,
  resolveCodexCliPath,
} from "@/lib/server/ai/cliPaths";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

/** 반복 fs 조회를 줄이기 위한 모듈 레벨 캐시(TTL). 로컬에서 CLI 설치 상태 변경 즉시성은 30초 내. */
const CACHE_TTL_MS = 30_000;
let cache: { value: Record<AIAnalysisProvider, boolean>; expiresAt: number } | null = null;

/** claude·codex CLI 각각의 로컬 설치 여부. */
export function detectProviders(): Record<AIAnalysisProvider, boolean> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const value: Record<AIAnalysisProvider, boolean> = {
    claude: binaryAvailable(resolveClaudeCliPath()),
    codex: binaryAvailable(resolveCodexCliPath()),
  };
  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}
