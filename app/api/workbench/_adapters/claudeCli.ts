/**
 * Claude CLI subprocess 어댑터.
 *
 * PRD `claude-cli-analysis` §3.1 / §3.2 / §3.4 — 로컬 claude CLI 를 subprocess 로 호출해 6블록 응답을 생성.
 *
 * 호출 방식 — `execFile` (shell 미경유) + stdin pipe (긴/특수문자 prompt 안전):
 *   claude --print --output-format json [--model <id>] [--system-prompt <...>]
 *   stdin 으로 user prompt 전달.
 *
 * - `CLAUDE_CLI_PATH` (기본 `claude`) 로 binary override 가능.
 * - `CLAUDE_CLI_MODEL` (옵션) 로 모델 지정.
 * - timeout 30초 — `execFile` 의 `timeout` option 으로 위임. node 가 만료 시 child 에
 *   SIGTERM 을 보낸 뒤 종료를 기다린다. (PR #23 머지 시점 헤더 주석에 `AbortController` 표현이
 *   있었으나 실제로는 AbortController 를 쓰지 않는다 — polish-followups §3.5 B2 로 정합.)
 *   타임아웃 분기 판정: callback err.killed === true 이고 signal 이 SIGTERM/SIGKILL 인 경우.
 * - stdout 의 JSON 을 parse → `AnalyzeResponse` 로 normalize.
 * - 코드펜스 (```json ... ```) 가 섞인 경우 strip 후 재시도.
 * - exit code ≠ 0, ENOENT, JSON parse 실패, 6블록 누락 → 한글 폴백 메시지 반환 (throw 안 함).
 * - v6 (polish-followups §3.3 A3): 6블록 중 어느 블록이 누락됐는지 사용자에게 한글로 안내 —
 *   `CLAUDE_CLI_FALLBACKS.missing_<block>` 카탈로그 사용. 누락된 첫 블록 감지 시점에 early return.
 * - v6 (polish-followups §3.6 B3): `position` nested shape narrowing 추가 — type guard 통과 못하면
 *   `malformed_position` 메시지로 502 반환. null 또는 미정의는 정상 (position 자체가 nullable).
 *
 * Vercel 안전 가드 (§3.7) — `process.env.VERCEL` 감지 시 호출 거부.
 */

import { execFile, type ExecFileOptionsWithStringEncoding } from "node:child_process";

import type {
  AnalyzeAnalysis,
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/types/workbench/analyze";
import { CLAUDE_CLI_FALLBACKS } from "@/lib/copy/workbench/errorMessages";
import { isVercelEnv } from "@/lib/server/env";

import { buildUserPrompt, getSystemPrompt } from "./prompt";
import type { AdapterResult, AnalyzeAdapter } from "./types";

const TIMEOUT_MS = 30_000;
const MAX_STDOUT_BYTES = 4 * 1024 * 1024; // 4MB.

const MSG_VERCEL_UNSUPPORTED = CLAUDE_CLI_FALLBACKS.cli_unsupported;
const MSG_CLI_MISSING = CLAUDE_CLI_FALLBACKS.cli_missing;
const MSG_CLI_ERROR = CLAUDE_CLI_FALLBACKS.cli_error;
const MSG_TIMEOUT = CLAUDE_CLI_FALLBACKS.cli_timeout;
const MSG_MALFORMED = CLAUDE_CLI_FALLBACKS.cli_malformed;

export class ClaudeCliAdapter implements AnalyzeAdapter {
  private readonly binaryPath: string;
  private readonly model: string | undefined;

  constructor(options?: { binaryPath?: string; model?: string }) {
    this.binaryPath =
      options?.binaryPath ?? process.env.CLAUDE_CLI_PATH ?? "claude";
    this.model = options?.model ?? process.env.CLAUDE_CLI_MODEL;
  }

  async analyze(input: AnalyzeRequest): Promise<AdapterResult> {
    if (isVercelEnv()) {
      logServer("[claude-cli] Vercel 환경 감지 — 호출 거부");
      return { ok: false, status: 503, error: MSG_VERCEL_UNSUPPORTED };
    }

    const systemPrompt = getSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    const args: string[] = ["--print", "--output-format", "json", "--system-prompt", systemPrompt];
    if (this.model && this.model.trim() !== "") {
      args.push("--model", this.model.trim());
    }

    let cliResult: CliInvokeResult;
    try {
      cliResult = await invokeCli(this.binaryPath, args, userPrompt);
    } catch (err: unknown) {
      const code = errorCode(err);
      if (code === "ENOENT") {
        logServer("[claude-cli] ENOENT — binary not found", err);
        return { ok: false, status: 500, error: MSG_CLI_MISSING };
      }
      logServer("[claude-cli] unexpected error", err);
      return { ok: false, status: 500, error: MSG_CLI_ERROR };
    }

    if (cliResult.timedOut) {
      logServer("[claude-cli] timeout", { stderr: cliResult.stderr });
      return { ok: false, status: 504, error: MSG_TIMEOUT };
    }

    if (cliResult.exitCode !== 0) {
      logServer("[claude-cli] non-zero exit", {
        code: cliResult.exitCode,
        stderr: cliResult.stderr.slice(0, 2000),
      });
      return { ok: false, status: 502, error: MSG_CLI_ERROR };
    }

    const extracted = extractAssistantJson(cliResult.stdout);
    if (!extracted) {
      logServer("[claude-cli] JSON parse failed", {
        stdout: cliResult.stdout.slice(0, 2000),
      });
      return { ok: false, status: 502, error: MSG_MALFORMED };
    }

    const result = normalizeAnalyzeResponse(extracted, input);
    if (!result.ok) {
      logServer("[claude-cli] schema validation failed", {
        reason: result.reason,
        sample: JSON.stringify(extracted).slice(0, 2000),
      });
      return { ok: false, status: 502, error: result.error };
    }

    return { ok: true, status: 200, data: result.data };
  }
}

/* -------------------------------------------------------------------------- */
/* subprocess 호출                                                            */
/* -------------------------------------------------------------------------- */

type CliInvokeResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
};

function invokeCli(
  binaryPath: string,
  args: string[],
  stdinPayload: string,
): Promise<CliInvokeResult> {
  return new Promise((resolve, reject) => {
    const options: ExecFileOptionsWithStringEncoding = {
      encoding: "utf-8",
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_STDOUT_BYTES,
      // shell: false (default) — shell 미경유 → shell injection 차단.
    };

    const child = execFile(binaryPath, args, options, (error, stdout, stderr) => {
      if (error) {
        // ENOENT 등 시작 단계 실패는 reject 로.
        const code = errorCode(error);
        if (code === "ENOENT") {
          reject(error);
          return;
        }
        // timeout 으로 SIGKILL/SIGTERM 받은 경우 — child.killed 검사로 분기.
        const killed = (error as NodeJS.ErrnoException & { killed?: boolean }).killed === true;
        const signal = (error as NodeJS.ErrnoException & { signal?: string }).signal;
        const timedOut = killed && (signal === "SIGTERM" || signal === "SIGKILL");
        resolve({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          exitCode: typeof error.code === "number" ? error.code : 1,
          timedOut,
        });
        return;
      }
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        exitCode: 0,
        timedOut: false,
      });
    });

    // stdin 으로 user prompt 전달 → 닫음.
    if (child.stdin) {
      child.stdin.on("error", () => {
        // stdin 쪽 EPIPE 는 무시 — exit handler 가 결과를 결정한다.
      });
      child.stdin.end(stdinPayload, "utf-8");
    }
  });
}

/* -------------------------------------------------------------------------- */
/* stdout → JSON 추출                                                          */
/* -------------------------------------------------------------------------- */

/**
 * claude CLI 가 `--output-format json` 으로 출력하면 다음 shape 의 envelope 을 돌려준다:
 *   { "type": "result", "subtype": "success", "result": "<assistant text>", ... }
 *
 * 본 함수는 다음 순서로 파싱을 시도한다:
 *   1. stdout 전체를 JSON.parse → envelope.result 안에서 JSON 객체 추출.
 *   2. (1) 실패 시 stdout 전체를 raw 텍스트로 보고 JSON 객체 추출 시도.
 *
 * JSON 객체 추출은 코드펜스 (```json ... ```) strip + 첫 `{` 부터 마지막 `}` 까지 슬라이스.
 */
function extractAssistantJson(stdout: string): unknown | null {
  const trimmed = stdout.trim();
  if (trimmed === "") return null;

  // 1) claude CLI envelope.
  try {
    const envelope = JSON.parse(trimmed) as Record<string, unknown>;
    if (envelope && typeof envelope === "object") {
      const result = envelope.result;
      if (typeof result === "string") {
        const inner = parseLooseJson(result);
        if (inner !== null) return inner;
      }
      // 일부 버전은 result 안에 이미 객체가 들어있을 수 있다.
      if (result && typeof result === "object") return result;
      // envelope 자체가 우리 응답 shape 인 케이스 (드물지만 보호).
      if ("analysis" in envelope) return envelope;
    }
  } catch {
    // fallthrough — raw 텍스트로 재시도.
  }

  // 2) raw 텍스트로 직접 파싱.
  return parseLooseJson(trimmed);
}

/**
 * 코드펜스/잡음을 허용하는 JSON 파서.
 * - ```json ... ``` 또는 ``` ... ``` 코드펜스 strip 후 시도.
 * - 첫 `{` 부터 마지막 `}` 까지 슬라이스 후 시도.
 */
function parseLooseJson(raw: string): unknown | null {
  const candidates: string[] = [];
  const text = raw.trim();
  if (text === "") return null;

  candidates.push(text);

  // 코드펜스 strip.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence && fence[1]) {
    candidates.push(fence[1].trim());
  }

  // 첫 `{` 부터 마지막 `}` 까지 슬라이스.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next.
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* AnalyzeResponse 로 narrowing                                                */
/* -------------------------------------------------------------------------- */

/**
 * normalize 결과 — 성공이면 6블록 완전한 AnalyzeResponse, 실패면 누락 블록을 식별한 한글 에러.
 *
 * v6 (polish-followups §3.3 A3) — `'malformed'` 일괄 메시지가 아닌 누락된 블록을 한글로 안내.
 * 누락 블록 우선순위: action → brief → feasibility → horizons → risk_plan → warnings 순.
 */
type NormalizeResult =
  | { ok: true; data: AnalyzeResponse }
  | { ok: false; reason: NormalizeReason; error: string };

type NormalizeReason =
  | "not_object"
  | "missing_action"
  | "missing_brief"
  | "missing_feasibility"
  | "missing_horizons"
  | "missing_risk_plan"
  | "missing_warnings"
  | "malformed_position";

/**
 * 추출된 JSON 을 `AnalyzeResponse` shape 으로 narrowing.
 *
 * - 최상위에 `analysis` 가 없으면 전체가 `AnalyzeAnalysis` 인 케이스를 흡수 ({ analysis } 로 wrap).
 * - 핵심 6블록 (`action`, `brief`, `feasibility`, `horizons`, `risk_plan`, `warnings`) 누락 시
 *   해당 블록을 식별한 한글 메시지로 reason + error 반환 (v6 A3).
 * - `position` nested shape 가 있는데 narrowing 실패면 `malformed_position` (v6 B3).
 * - 보조 필드 (`ai_summary`, `whitelist_entry`, `input` 등) 누락 시 기본값 fallback (PR #23 무회귀).
 */
function normalizeAnalyzeResponse(
  payload: unknown,
  input: AnalyzeRequest,
): NormalizeResult {
  if (!isObject(payload)) {
    return { ok: false, reason: "not_object", error: MSG_MALFORMED };
  }

  const rawAnalysis = isObject(payload.analysis) ? payload.analysis : payload;
  if (!isObject(rawAnalysis)) {
    return { ok: false, reason: "not_object", error: MSG_MALFORMED };
  }

  const action = rawAnalysis.action;
  const brief = rawAnalysis.brief;
  const feasibility = rawAnalysis.feasibility;
  const horizons = rawAnalysis.horizons;
  const riskPlan = rawAnalysis.risk_plan;
  const rawWarnings = rawAnalysis.warnings;

  // v6 A3: 6블록 누락 우선순위 검사. 첫 누락 블록에서 early return.
  if (typeof action !== "string" || action.trim() === "") {
    return {
      ok: false,
      reason: "missing_action",
      error: CLAUDE_CLI_FALLBACKS.missing_action,
    };
  }
  if (!isObject(brief)) {
    return {
      ok: false,
      reason: "missing_brief",
      error: CLAUDE_CLI_FALLBACKS.missing_brief,
    };
  }
  if (typeof feasibility !== "string" || feasibility.trim() === "") {
    return {
      ok: false,
      reason: "missing_feasibility",
      error: CLAUDE_CLI_FALLBACKS.missing_feasibility,
    };
  }
  if (!Array.isArray(horizons)) {
    return {
      ok: false,
      reason: "missing_horizons",
      error: CLAUDE_CLI_FALLBACKS.missing_horizons,
    };
  }
  if (!isObject(riskPlan)) {
    return {
      ok: false,
      reason: "missing_risk_plan",
      error: CLAUDE_CLI_FALLBACKS.missing_risk_plan,
    };
  }
  if (!Array.isArray(rawWarnings)) {
    return {
      ok: false,
      reason: "missing_warnings",
      error: CLAUDE_CLI_FALLBACKS.missing_warnings,
    };
  }

  // v6 B3: position nested shape narrowing — null/undefined 는 정상, 객체이면 type guard 통과 필수.
  const rawPosition = rawAnalysis.position;
  let position: AnalyzeAnalysis["position"];
  if (rawPosition === null || rawPosition === undefined) {
    position = null;
  } else if (isPositionShape(rawPosition)) {
    position = rawPosition;
  } else {
    return {
      ok: false,
      reason: "malformed_position",
      error: CLAUDE_CLI_FALLBACKS.malformed_position,
    };
  }

  const whitelistEntry = isObject(rawAnalysis.whitelist_entry)
    ? rawAnalysis.whitelist_entry
    : { ticker: input.ticker, asset_type: "unknown" };

  const inputEcho = isObject(rawAnalysis.input)
    ? rawAnalysis.input
    : {
        ticker: input.ticker,
        capital_amount: input.capital_amount,
        target_return_pct: input.target_return_pct,
        target_period_days: input.target_period_days,
        max_loss_pct: input.max_loss_pct ?? 2,
      };

  const annualized =
    typeof rawAnalysis.annualized_target_return_pct === "number"
      ? rawAnalysis.annualized_target_return_pct
      : 0;

  const aiSummary =
    typeof rawAnalysis.ai_summary === "string" || rawAnalysis.ai_summary === null
      ? (rawAnalysis.ai_summary as string | null)
      : null;

  const normalized: AnalyzeAnalysis = {
    input: inputEcho as AnalyzeAnalysis["input"],
    whitelist_entry: whitelistEntry as AnalyzeAnalysis["whitelist_entry"],
    brief: brief as AnalyzeAnalysis["brief"],
    feasibility,
    annualized_target_return_pct: annualized,
    horizons: horizons as AnalyzeAnalysis["horizons"],
    risk_plan: riskPlan as AnalyzeAnalysis["risk_plan"],
    position,
    action,
    ai_summary: aiSummary,
    warnings: rawWarnings as AnalyzeAnalysis["warnings"],
  };

  return { ok: true, data: { analysis: normalized } };
}

/**
 * v6 (polish-followups §3.6 B3) — `position` nested shape narrowing.
 *
 * `lib/types/workbench/analyze.ts` 의 `AnalyzeAnalysis.position` 은 `unknown | null` 로 열려 있어
 * 실 상위 컴포넌트가 부분 정보로도 동작하지만, claude 가 잘못된 shape 을 흘려보내면
 * 결과 패널에서 런타임 오류가 발생할 위험이 있다. 본 type guard 는 보수적으로
 * "객체이고 entry / stop / target 셋 중 하나라도 존재" 를 통과 조건으로 둔다 (BE 마이그레이션 안정성).
 * 셋 모두 부재한 객체 (예: `{ foo: 1 }`) 는 잘못된 shape 으로 간주.
 */
function isPositionShape(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  return "entry" in value || "stop" in value || "target" in value;
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * 서버 로그 전용 — 사용자 응답에는 stderr/stack 미노출 (AC-19).
 */
function logServer(label: string, payload?: unknown): void {
  if (payload === undefined) {
    console.warn(label);
    return;
  }
  console.warn(label, payload);
}
