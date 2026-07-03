/**
 * Claude CLI 호출 유틸 — route handler(BFF) 서버 전용.
 *
 * `invokeClaudeAgentStream` 은 Claude CLI를 `spawn`으로 실행하고
 * `--output-format stream-json` NDJSON을 한 줄씩 파싱한다.
 * onToken 콜백은 각 assistant 이벤트 도착 시 새 텍스트 부분을 forward한다.
 *
 * ⚠️ CLI는 응답 완료 후 전체 텍스트를 1개 assistant 이벤트로 emit — API 직접 호출처럼
 *    토큰 단위 스트리밍이 아님. result 이벤트가 최종 권위 텍스트.
 *
 * stream-json 이벤트 포맷 (--verbose 필수):
 *   system       → init 메타 (무시)
 *   assistant    → message.content[0].text (누산 텍스트, diff로 새 부분 추출)
 *   result       → 최종 완성 텍스트
 */

import { spawn } from "child_process";
import readline from "node:readline";
import { type AgentUsage, UNMEASURED_USAGE } from "@/lib/types/stock/aiAnalysis";

export interface AgentCallOpts {
  systemPrompt: string;
  userPrompt: string;
  tools: string[];
  timeoutMs: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
}

/** 에이전트 스트림 호출 결과 — 텍스트 + (가능하면) 토큰 사용량. */
export interface AgentStreamResult {
  text: string;
  usage: AgentUsage;
}

/**
 * modelUsage 에서 주 모델명을 추출. 없으면 null.
 * Claude CLI 는 보조 작업(요약 등)에 haiku 를 함께 써서 modelUsage 에 여러 모델이 섞일 수 있다.
 * 첫 키(keys[0])는 보조 모델일 수 있어, **실사용량(토큰 합)이 가장 큰 모델**을 주 모델로 고른다.
 */
function extractModel(modelUsage: unknown): string | null {
  if (!modelUsage || typeof modelUsage !== "object") return null;
  const entries = Object.entries(modelUsage as Record<string, unknown>);
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0][0];
  // 항목별 숫자 필드 총합(토큰·캐시 등) — 키 케이싱에 무관하게 사용 규모를 비교.
  const usageScore = (v: unknown): number =>
    v && typeof v === "object"
      ? Object.values(v as Record<string, unknown>).reduce<number>(
          (s, x) => s + (typeof x === "number" ? x : 0),
          0,
        )
      : 0;
  let best = entries[0];
  for (const e of entries) if (usageScore(e[1]) > usageScore(best[1])) best = e;
  return best[0];
}

/** claude CLI result 이벤트에서 AgentUsage 를 구성. usage 누락 시 measured:false. */
function buildClaudeUsage(event: Record<string, unknown>): AgentUsage {
  const u = event.usage as Record<string, unknown> | undefined;
  if (!u || typeof u !== "object") return { ...UNMEASURED_USAGE };
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  return {
    inputTokens: num(u.input_tokens),
    outputTokens: num(u.output_tokens),
    cacheCreationInputTokens: num(u.cache_creation_input_tokens),
    cacheReadInputTokens: num(u.cache_read_input_tokens),
    costUsd: num(event.total_cost_usd),
    model: extractModel(event.modelUsage),
    measured: true,
  };
}

export function invokeClaudeAgentStream(
  bin: string,
  model: string | undefined,
  opts: AgentCallOpts,
  signal: AbortSignal,
  onToken: (token: string) => void,
): Promise<AgentStreamResult> {
  return new Promise<AgentStreamResult>((resolve, reject) => {
    if (signal.aborted) {
      reject(Object.assign(new Error("AbortError"), { name: "AbortError" }));
      return;
    }

    const args = [
      "--print",
      "--output-format", "stream-json",
      "--verbose",
      "--system-prompt", opts.systemPrompt,
    ];
    if (opts.tools.length > 0) {
      args.push("--allowedTools", opts.tools.join(","));
    }
    if (model?.trim()) {
      args.push("--model", model.trim());
    }
    if (opts.effort) {
      args.push("--effort", opts.effort);
    }

    const child = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" },
    });

    if (child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.end(opts.userPrompt, "utf-8");
    }

    let accumulated = "";
    let prevAssistantLen = 0;
    let settled = false;

    const settle = (fn: () => void) => {
      if (!settled) { settled = true; fn(); }
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      settle(() => reject(Object.assign(
        new Error(`에이전트 타임아웃 (${opts.timeoutMs / 1000}초 초과)`),
        { name: "TimeoutError" },
      )));
    }, opts.timeoutMs);

    const onAbort = () => {
      child.kill("SIGTERM");
      settle(() => reject(Object.assign(new Error("AbortError"), { name: "AbortError" })));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };

    const rl = readline.createInterface({ input: child.stdout!, crlfDelay: Infinity });

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let event: Record<string, unknown>;
      try { event = JSON.parse(trimmed) as Record<string, unknown>; }
      catch { return; }

      // ENOENT — CLI 실행 자체가 불가한 경우 system 이벤트에서 감지
      if (event.type === "system" && (event as Record<string, unknown>).subtype === "error") {
        cleanup();
        settle(() => reject(new Error("claude CLI를 찾을 수 없어요. 설치 후 재시도해 주세요.")));
        return;
      }

      // Format A: content_block_delta (델타 기반 스트리밍)
      const delta = event.delta as Record<string, unknown> | undefined;
      if (event.type === "content_block_delta" && delta?.type === "text_delta") {
        const token = String(delta.text ?? "");
        if (token) { accumulated += token; onToken(token); }
        return;
      }

      // Format B: assistant message (누산 텍스트 diff)
      if (event.type === "assistant") {
        const msg = event.message as Record<string, unknown> | undefined;
        const content = Array.isArray(msg?.content) ? msg!.content as Record<string, unknown>[] : [];
        const tb = content.find(b => b?.type === "text");
        if (tb && typeof tb.text === "string" && tb.text.length > prevAssistantLen) {
          const newPart = tb.text.slice(prevAssistantLen);
          prevAssistantLen = tb.text.length;
          accumulated = tb.text;
          onToken(newPart);
        }
        return;
      }

      // 최종 result 이벤트
      if (event.type === "result") {
        if (event.subtype === "success") {
          const finalText = typeof event.result === "string" ? event.result : accumulated;
          const usage = buildClaudeUsage(event);
          cleanup();
          settle(() => resolve({ text: finalText, usage }));
        } else if (event.is_error) {
          const errMsg = typeof event.result === "string" ? event.result : "Claude CLI 오류";
          cleanup();
          settle(() => reject(new Error(errMsg)));
        }
      }
    });

    child.on("close", (code) => {
      cleanup();
      if (settled) return;
      // result 이벤트 없이 종료 — 텍스트만 폴백, 토큰은 미측정 처리.
      if (accumulated) settle(() => resolve({ text: accumulated, usage: { ...UNMEASURED_USAGE } }));
      else settle(() => reject(new Error(`Claude CLI 비정상 종료 (code=${code})`)));
    });

    child.on("error", (err) => {
      cleanup();
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") {
        settle(() => reject(Object.assign(err, { message: "claude CLI를 찾을 수 없어요. 설치 후 재시도해 주세요." })));
      } else {
        settle(() => reject(err));
      }
    });
  });
}
