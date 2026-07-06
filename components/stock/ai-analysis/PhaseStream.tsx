"use client";

import { cn } from "@/lib/utils/cn";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentKey, AgentState, AgentStatus } from "@/lib/types/stock/aiAnalysis";

/**
 * 진행중(running) 페이즈 스트리밍 프리미티브 — 노스스타 `.stream-agents`/`.stream-box`/`.stream-eta`.
 *
 * 완료(done) 뷰는 각 페이즈 본문이 그대로 그린다(PHASE 1 미변경). 이 프리미티브는 **진행 중**에만 쓰여
 * ① 서브 에이전트 상태 pip 행 ② 지금 토큰을 뿜는 활성 에이전트 라이브 박스 ③ 진행 카운터를 담당한다.
 *
 * 색은 앱 토큰만(#280 매핑): done=signal-done · run=accent-vivid(흰 텍스트) · wait=border-line · error=critical.
 * blink 점·커서는 `motion-reduce` 에서 정지한다(과한 애니메이션 억제).
 */

export interface StreamPip {
  /** React key + 식별. */
  key: string;
  /** pill 라벨(짧은 도메인/역할 명). */
  label: string;
  status: AgentStatus;
}

/**
 * 노스스타 `.stream-agents` — 서브 에이전트 상태 pill 행(wrap). 진행 상태를 색으로 구분한다.
 * 장식(상태는 stream-eta·헤더가 텍스트로도 노출) — aria-hidden.
 */
export function StreamPips({ pips }: { pips: StreamPip[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden="true">
      {pips.map((p) => (
        <span
          key={p.key}
          className={cn(
            // `.sa` — 11px pill, 상태별 톤.
            "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-caption font-medium",
            p.status === "done" && "border-signal-done-soft bg-signal-done-soft text-signal-done",
            p.status === "running" && "border-accent-vivid bg-accent-vivid text-surface",
            p.status === "pending" && "border-border-line text-text-muted",
            p.status === "error" && "border-critical-soft bg-critical-soft text-critical",
          )}
        >
          {/* `.sd` 점 — run 만 blink(motion-reduce 정지). */}
          <span
            className={cn(
              "h-1.5 w-1.5 flex-none rounded-full bg-current",
              p.status === "running" && "animate-pulse motion-reduce:animate-none",
            )}
          />
          {p.label}
        </span>
      ))}
    </div>
  );
}

/**
 * 노스스타 `.stream-box` — 회색 박스 + 활성 에이전트 라이브 토큰.
 * `.sbx-who`(accent, "{에이전트} · 작성 중") + 스트리밍 텍스트 tail + blink 커서(accent 세로바).
 * 토큰이 아직 없으면 `fallback`(에이전트 진행 문구)으로 빈 화면을 막는다.
 */
export function StreamBox({
  who,
  text,
  fallback,
}: {
  who: string;
  text: string;
  fallback?: string;
}) {
  // 라이브 tail — 마크다운 기호·개행을 걷어 한 흐름으로 만들고 최근 토큰만(커서가 항상 끝에 보이게).
  const flowing = text ? stripMarkdown(text).replace(/\s+/g, " ").trim() : "";
  const tail = flowing.length > 220 ? `…${flowing.slice(-220)}` : flowing;
  const body = tail || fallback || COPY.card.analyzing;

  return (
    <div className="rounded-md border border-border-line bg-surface-muted px-md py-md text-caption leading-relaxed text-text-strong">
      <span className="mb-1.5 block text-caption font-extrabold text-accent-vivid">{who}</span>
      <span className="whitespace-pre-wrap break-words">{body}</span>
      {/* `.cursor` — accent 세로바 blink(motion-reduce 정지). */}
      <span className="ml-0.5 inline-block h-3.5 w-0.5 align-middle bg-accent-vivid animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

/** 노스스타 `.stream-eta` — 진행 카운터 행("에이전트 N / total 완료"). 경과/예상 시간은 데이터 미보유로 생략. */
export function StreamEta({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex justify-between text-caption text-text-muted">
      <span>{COPY.phase.stream.eta(done, total)}</span>
    </div>
  );
}

/**
 * 병렬 스트리밍(분석가 4·리스크 3은 Promise.allSettled 로 동시 실행) 중 **활성 에이전트 하나** 선택 —
 * running 중 streamingChunk 가 가장 긴(가장 활발히 토큰을 뿜는) 에이전트. 인터리브로 인한 who/텍스트
 * 깜빡임을 피하려 '가장 최근 갱신' 대신 안정적인 '가장 앞선 러닝'을 쓴다(전원 상태는 pip 가 담당).
 * running 이 없으면(전부 완료·대기·정지) null → stream-box 미표시.
 */
export function activeStreamAgent(
  agents: AgentState[],
  keys: readonly AgentKey[],
): AgentState | null {
  const running = keys
    .map((k) => agents.find((a) => a.key === k))
    .filter((a): a is AgentState => !!a && a.status === "running");
  if (running.length === 0) return null;
  return running.reduce((a, b) => (b.streamingChunk.length > a.streamingChunk.length ? b : a));
}
