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
 * - timeout 30초 (`AbortController`). 도달 시 `child.kill('SIGKILL')`.
 * - stdout 의 JSON 을 parse → `AnalyzeResponse` 로 normalize.
 * - 코드펜스 (```json ... ```) 가 섞인 경우 strip 후 재시도.
 * - exit code ≠ 0, ENOENT, JSON parse 실패, 6블록 누락 → 한글 폴백 메시지 반환 (throw 안 함).
 *
 * Vercel 안전 가드 (§3.7) — `process.env.VERCEL` 감지 시 호출 거부.
 */

import { execFile, type ExecFileOptionsWithStringEncoding } from "node:child_process";

import type {
  AnalyzeAnalysis,
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/types/workbench/analyze";

import { buildUserPrompt, getSystemPrompt } from "./prompt";
import type { AdapterResult, AnalyzeAdapter } from "./types";

const TIMEOUT_MS = 30_000;
const MAX_STDOUT_BYTES = 4 * 1024 * 1024; // 4MB.

const MSG_VERCEL_UNSUPPORTED =
  "Vercel 환경에서는 claude CLI 모드를 사용할 수 없습니다. 로컬 환경에서 실행해 주세요.";
const MSG_CLI_MISSING =
  "claude CLI 가 설치되어 있지 않거나 경로가 올바르지 않아요.";
const MSG_CLI_ERROR =
  "분석 도구 호출에 실패했어요. 잠시 후 다시 시도해 주세요.";
const MSG_TIMEOUT =
  "분석이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.";
const MSG_MALFORMED =
  "분석 결과 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.";

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

    const normalized = normalizeAnalyzeResponse(extracted, input);
    if (!normalized) {
      logServer("[claude-cli] schema validation failed", {
        sample: JSON.stringify(extracted).slice(0, 2000),
      });
      return { ok: false, status: 502, error: MSG_MALFORMED };
    }

    return { ok: true, status: 200, data: normalized };
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
 * 추출된 JSON 을 `AnalyzeResponse` shape 으로 narrowing.
 *
 * - 최상위에 `analysis` 가 없으면 전체가 `AnalyzeAnalysis` 인 케이스를 흡수 ({ analysis } 로 wrap).
 * - 핵심 필드 (`brief`, `feasibility`, `horizons`, `risk_plan`, `action`) 누락 시 null 반환 → malformed.
 * - 보조 필드 (`warnings`, `position`, `ai_summary`, `whitelist_entry`, `input` 등) 누락 시 기본값 fallback.
 */
function normalizeAnalyzeResponse(
  payload: unknown,
  input: AnalyzeRequest,
): AnalyzeResponse | null {
  if (!isObject(payload)) return null;

  const rawAnalysis = isObject(payload.analysis) ? payload.analysis : payload;
  if (!isObject(rawAnalysis)) return null;

  const brief = rawAnalysis.brief;
  const feasibility = rawAnalysis.feasibility;
  const horizons = rawAnalysis.horizons;
  const riskPlan = rawAnalysis.risk_plan;
  const action = rawAnalysis.action;

  if (!isObject(brief)) return null;
  if (typeof feasibility !== "string") return null;
  if (!Array.isArray(horizons)) return null;
  if (!isObject(riskPlan)) return null;
  if (typeof action !== "string") return null;

  const warnings = Array.isArray(rawAnalysis.warnings) ? rawAnalysis.warnings : [];

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
    position: rawAnalysis.position ?? null,
    action,
    ai_summary: aiSummary,
    warnings: warnings as AnalyzeAnalysis["warnings"],
  };

  return { analysis: normalized };
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

function isVercelEnv(): boolean {
  return (
    process.env.VERCEL === "1" ||
    typeof process.env.VERCEL_ENV === "string" ||
    typeof process.env.NEXT_PUBLIC_VERCEL_ENV === "string"
  );
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
