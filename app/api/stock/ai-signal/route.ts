/**
 * `/api/stock/ai-signal` — 시그널 데이터 + Claude CLI 웹 리서치 최종 판단.
 *
 * POST { ticker: string }
 *
 * 응답: SSE(text/event-stream)
 *   data: { message: string }   — 진행 단계 메시지
 *   data: { result: AISignalResponse } — 최종 판단
 *   data: { error: string }     — 오류 메시지
 *
 * ⚠️ Vercel 미지원(claude-cli 로컬 전용) — Vercel 환경 감지 시 503.
 * ⚠️ KIS 미설정 시 400.
 * ⚠️ 타임아웃 60s(웹 리서치 포함).
 */

import { execFile, type ExecFileOptionsWithStringEncoding } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured } from "@/lib/api/kis";
import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { evaluateSignal } from "@/lib/signal/engine";
import { AXIS_LABEL } from "@/lib/copy/signal/labels";
import type { AISignalResponse, AISignalVerdict } from "@/lib/types/stock/aiSignal";
import type { AxisScore } from "@/lib/types/signal";

const TIMEOUT_MS = 120_000;
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;
const CHART_DAYS = 200;

// ─── Vercel guard ────────────────────────────────────────────────────────────

function isVercelEnv(): boolean {
  return (
    process.env.VERCEL === "1" ||
    typeof process.env.VERCEL_ENV === "string" ||
    typeof process.env.NEXT_PUBLIC_VERCEL_ENV === "string"
  );
}

// ─── SSE 헬퍼 ────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function sseChunk(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ─── Claude CLI subprocess ────────────────────────────────────────────────────

type CliResult = { stdout: string; stderr: string; timedOut: boolean; exitCode: number };

function invokeCli(bin: string, args: string[], stdin: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const opts: ExecFileOptionsWithStringEncoding = {
      encoding: "utf-8",
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_STDOUT_BYTES,
    };
    const child = execFile(bin, args, opts, (error, stdout, stderr) => {
      const elapsed = Date.now() - startedAt;
      if (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") { reject(error); return; }
        const killed = (error as NodeJS.ErrnoException & { killed?: boolean }).killed === true;
        const sig = (error as NodeJS.ErrnoException & { signal?: string }).signal;
        // Claude CLI가 SIGTERM을 받으면 graceful exit(code=1)하므로 killed=false로 나온다.
        // elapsed 기반 fallback으로 타임아웃 감지.
        const timedOut =
          (killed && (sig === "SIGTERM" || sig === "SIGKILL")) ||
          (elapsed >= TIMEOUT_MS - 3_000 && !(stdout ?? "").trim());
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "", timedOut, exitCode: 1 });
        return;
      }
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "", timedOut: false, exitCode: 0 });
    });
    if (child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.end(stdin, "utf-8");
    }
  });
}

// ─── JSON 파싱 ────────────────────────────────────────────────────────────────

function parseLooseJson(raw: string): unknown | null {
  const text = raw.trim();
  if (!text) return null;
  const candidates = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  const i = text.indexOf("{"), j = text.lastIndexOf("}");
  if (i !== -1 && j > i) candidates.push(text.slice(i, j + 1));
  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* next */ }
  }
  return null;
}

function extractJson(stdout: string): unknown | null {
  const trimmed = stdout.trim();
  try {
    const env = JSON.parse(trimmed) as Record<string, unknown>;
    if (env && typeof env === "object") {
      const r = env.result;
      if (typeof r === "string") { const v = parseLooseJson(r); if (v) return v; }
      if (r && typeof r === "object") return r;
    }
  } catch { /* fallthrough */ }
  return parseLooseJson(trimmed);
}

// ─── 프롬프트 빌드 ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 한국 주식 분석가입니다.
주어진 기술적 시그널 데이터를 참고하고, 웹 검색으로 해당 종목의 최근 뉴스·공시·실적·시장 이슈를 직접 찾아본 뒤 종합 판단을 내려주세요.

반드시 아래 JSON 스키마에 정확히 일치하는 단일 JSON 객체로만 응답하세요. 마크다운·코드펜스·추가 텍스트 금지.

{
  "verdict": "BUY" | "HOLD" | "SELL" | "WATCH",
  "reasoning": "기술적 시그널과 최신 뉴스를 종합한 2~3문장 근거 (한국어)",
  "key_catalysts": ["최근 이벤트·뉴스 핵심 2~3개 (한국어)"],
  "risk_factors": ["주요 리스크 2~3개 (한국어)"],
  "confidence_note": "확신도 및 데이터 한계 한 문장 (한국어)",
  "disclaimer": "투자 권유가 아닌 참고 정보임을 명시하는 면책 한 문장 (한국어)"
}

모든 verdict·key·배열 구조는 위 스키마 그대로. 한국어 텍스트 필드는 반드시 한국어로.`;

function buildUserPrompt(ticker: string, axes: AxisScore[], score: number, action: string, confidence: number, regime: number, asOf: string): string {
  const regimeLabel = regime === 1 ? "강세(120선 우상향·가격 위)" : regime === -1 ? "약세(120선 우하향·가격 아래)" : "중립";
  const axesText = axes.map((a) => {
    const topHits = [...a.hits]
      .filter((h) => h.direction !== 0)
      .sort((x, y) => y.weight - x.weight)
      .slice(0, 2)
      .map((h) => h.detail ? `${h.key}(${h.detail})` : h.key)
      .join(", ");
    return `  ${AXIS_LABEL[a.axis]}: ${a.score.toFixed(0)}/100${topHits ? ` — ${topHits}` : ""}`;
  }).join("\n");

  return [
    `종목 코드: ${ticker}`,
    "",
    `=== 기술적 시그널 자동 계산 결과 (${asOf} 기준) ===`,
    `종합 신호: ${action} | 점수: ${score.toFixed(0)}/100 | 동의도: ${Math.round(confidence * 100)}%`,
    `장기추세 레짐: ${regimeLabel}`,
    "",
    "축별 점수:",
    axesText,
    "",
    `위 기술적 데이터를 참고하고, 웹 검색으로 ${ticker} 종목의 최근 뉴스·공시·실적·업황을 직접 찾아본 뒤 JSON으로만 응답하세요.`,
    "다른 어떤 텍스트도 포함하지 마세요.",
  ].join("\n");
}

// ─── Response normalize ───────────────────────────────────────────────────────

const VERDICTS = new Set<string>(["BUY", "HOLD", "SELL", "WATCH"]);

function normalizeResponse(raw: unknown): AISignalResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const verdict = typeof r.verdict === "string" && VERDICTS.has(r.verdict)
    ? (r.verdict as AISignalVerdict)
    : null;
  if (!verdict) return null;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    verdict,
    reasoning: typeof r.reasoning === "string" ? r.reasoning : "",
    key_catalysts: arr(r.key_catalysts),
    risk_factors: arr(r.risk_factors),
    confidence_note: typeof r.confidence_note === "string" ? r.confidence_note : "",
    disclaimer: typeof r.disclaimer === "string" ? r.disclaimer : "본 내용은 투자 권유가 아닙니다.",
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  if (isVercelEnv()) {
    return NextResponse.json(
      { error: "AI 최종 판단은 로컬 환경(next dev)에서만 사용할 수 있어요." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({})) as { ticker?: string };
  const ticker = (body.ticker ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400 });
  }

  if (!isKisConfigured()) {
    return NextResponse.json({ error: "KIS API가 설정되지 않아 시그널을 계산할 수 없어요." }, { status: 400 });
  }

  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - CHART_DAYS);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const fromStr = fmt(from);
  const todayStr = fmt(today);

  const bin = process.env.CLAUDE_CLI_PATH ?? "claude";
  const model = process.env.CLAUDE_CLI_MODEL;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sseChunk(data));

      try {
        console.log(`[ai-signal] ── 스트림 시작 ticker=${ticker}`);

        // 1단계: 시세 fetch
        send({ message: "시세 로딩 중…" });
        let candles;
        try {
          candles = await fetchDailyChunked(ticker, fromStr, todayStr);
          console.log(`[ai-signal] 봉수=${candles.length}`);
        } catch (err) {
          console.error("[ai-signal] ✗ 시세 fetch 실패", err);
          send({ error: "시세 데이터를 불러오는 데 실패했어요." });
          controller.close();
          return;
        }

        // 2단계: 시그널 계산
        send({ message: "시그널 계산 중…" });
        const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
        const signalResult = evaluateSignal(sorted);
        console.log(`[ai-signal] action=${signalResult.action} score=${signalResult.score.toFixed(0)} warmupOk=${signalResult.warmupOk}`);

        if (!signalResult.warmupOk) {
          send({ error: "데이터가 부족해 시그널을 계산할 수 없어요. (최소 130봉 필요)" });
          controller.close();
          return;
        }

        // 3단계: Claude CLI
        send({ message: "AI 분석 중…" });
        // --allowedTools: --print 모드에서 기본적으로 tool 사용이 차단됨.
        // WebSearch·WebFetch 명시로 웹 리서치 허용.
        const args = [
          "--print", "--output-format", "json",
          "--allowedTools", "WebSearch,WebFetch",
          "--system-prompt", SYSTEM_PROMPT,
        ];
        if (model?.trim()) args.push("--model", model.trim());

        const userPrompt = buildUserPrompt(
          ticker,
          signalResult.axes,
          signalResult.score,
          signalResult.action,
          signalResult.confidence,
          signalResult.regime,
          signalResult.asOf,
        );
        console.log(`[ai-signal] CLI 실행 bin="${bin}" prompt길이=${userPrompt.length}`);

        let cliResult: CliResult;
        try {
          const t0 = Date.now();
          cliResult = await invokeCli(bin, args, userPrompt);
          console.log(`[ai-signal] CLI 완료 exitCode=${cliResult.exitCode} timedOut=${cliResult.timedOut} stdout길이=${cliResult.stdout.length} stderr길이=${cliResult.stderr.length} elapsed=${Date.now() - t0}ms`);
          if (cliResult.stderr) console.warn("[ai-signal] stderr:", cliResult.stderr.slice(0, 500));
          if (cliResult.stdout) console.log("[ai-signal] stdout 미리보기:", cliResult.stdout.slice(0, 300));
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code;
          console.error("[ai-signal] ✗ CLI 실행 예외 code=", code, err);
          const msg = code === "ENOENT"
            ? "claude CLI를 찾을 수 없어요. claude CLI가 설치됐는지 확인해 주세요."
            : "claude CLI 호출에 실패했어요.";
          send({ error: msg });
          controller.close();
          return;
        }

        if (cliResult.timedOut) {
          console.warn("[ai-signal] ✗ 타임아웃");
          send({ error: "AI 분석이 60초를 초과했어요. 잠시 후 다시 시도해 주세요." });
          controller.close();
          return;
        }
        if (cliResult.exitCode !== 0 && !cliResult.stdout) {
          console.warn(`[ai-signal] ✗ exitCode=${cliResult.exitCode} stdout 없음`);
          send({ error: `AI 분석 중 오류가 발생했어요. (exitCode=${cliResult.exitCode}${cliResult.stderr ? ` — ${cliResult.stderr.slice(0, 100)}` : ""})` });
          controller.close();
          return;
        }

        const extracted = extractJson(cliResult.stdout);
        if (!extracted) {
          console.warn("[ai-signal] ✗ JSON 파싱 실패", cliResult.stdout.slice(0, 500));
          send({ error: "AI 응답 파싱에 실패했어요." });
          controller.close();
          return;
        }

        const judgment = normalizeResponse(extracted);
        if (!judgment) {
          console.warn("[ai-signal] ✗ normalize 실패", extracted);
          send({ error: "AI 응답 형식이 올바르지 않아요." });
          controller.close();
          return;
        }

        console.log(`[ai-signal] ✓ 완료 verdict=${judgment.verdict}`);
        send({ result: judgment });
        controller.close();
      } catch (err) {
        console.error("[ai-signal] ✗ 예상치 못한 예외", err);
        send({ error: "분석 중 예상치 못한 오류가 발생했어요." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
