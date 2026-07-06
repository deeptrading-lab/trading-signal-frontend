"use client";

import { cn } from "@/lib/utils/cn";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { InlineStream } from "./PhaseStream";
import type { AgentKey, AgentState } from "@/lib/types/stock/aiAnalysis";

/**
 * ③ 종합 페이즈 본문 — 리서치매니저 → 트레이더(심층 추론 배지) → 리스크 3인(공격·중립·보수).
 *
 * 진행/완료가 **같은 flat 구조**(`.syn-row` 2행 + `.risk-3` 3카드)를 그리고, 각 요소가 자기 상태를 인라인으로 노출한다.
 *   - done: 요약(클릭 → 전체보기). 트레이더 '심층 추론' 배지 보존. 리스크 카드는 스탠스 태그를 곁들인다.
 *   - running: **라이브 토큰 미리보기**(끝부분 + 커서). 리서치매니저→트레이더 순차, 리스크 3인 병렬(각자 흐름).
 *   - pending/error: 상태 텍스트(대기/오류). 오류 재개는 상위 PhaseRow 어포던스가 담당.
 */
const RISK_KEYS = ["risk_risky", "risk_neutral", "risk_safe"] as const;
const PLAN_KEYS = ["research_manager", "trader"] as const;

/**
 * 리스크 역할별 특성 스탠스 태그 톤(#280 매핑) — 각 검토관의 고정 렌즈(종목별 판정 아님, COPY.phaseDone.riskTag 주석 참조).
 * 완료 카드에서만 노출(진행/대기 중엔 결과 오해 방지로 미표기).
 */
const RISK_TAG_TONE: Record<(typeof RISK_KEYS)[number], string> = {
  risk_risky: "bg-signal-up-soft text-signal-up",
  risk_neutral: "bg-warn-soft text-warn",
  risk_safe: "bg-surface text-text-muted",
};

/** 진행중 라이브·완료 요약 행이 공유하는 그리드(라벨 82px + 내용). */
const SYN_ROW_CLASS = "grid grid-cols-[82px_1fr] items-baseline gap-md px-1.5 py-1.5";
const RISK_CARD_CLASS = "flex flex-col gap-1 rounded-sm border border-border-line bg-surface-muted px-2 py-2";

/** 진행중 행/카드 앞에 붙는 accent 맥박 점(작성 중 표식). */
function WritingDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full bg-accent-vivid align-middle animate-pulse motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function SynthesisPhaseBody({
  agents,
  reports,
  onExpand,
}: {
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  onExpand: (title: string, content: string, highlight?: string) => void;
}) {
  const agentOf = (key: AgentKey) => agents.find((a) => a.key === key);
  const statusOf = (key: AgentKey) => agentOf(key)?.status ?? "pending";

  return (
    <div className="space-y-3">
      {/* 리서치매니저 · 트레이더 — `.syn-row`(라벨 82px + 내용). */}
      <div className="flex flex-col">
        {PLAN_KEYS.map((key) => {
          const status = statusOf(key);
          const meta = AGENT_META.find((m) => m.key === key)!;
          const content = reports[key];
          const label = (
            <span className="text-caption font-bold text-text-muted">
              {COPY.phaseDone.synLabel[key]}
            </span>
          );
          // 심층 추론 배지 — 트레이더 행에서 done/running 공통 보존(gradient-ai 인디고 톤).
          const traderBadge =
            key === "trader" ? (
              <span className="mr-1 rounded-pill bg-gradient-ai-soft px-1.5 py-0.5 align-middle text-caption font-bold text-gradient-ai-from">
                {COPY.panel.deepReasoning}
              </span>
            ) : null;

          if (status === "done") {
            const preview = content ? stripMarkdown(content) : COPY.phaseDone.emptyPreview;
            const inner = (
              <>
                {label}
                <span className="min-w-0 text-caption leading-relaxed text-text-strong line-clamp-2">
                  {traderBadge}
                  {preview}
                </span>
              </>
            );
            return content ? (
              <button
                key={key}
                type="button"
                onClick={() => onExpand(meta.label, content)}
                className={cn(SYN_ROW_CLASS, "rounded-sm text-left transition-colors hover:bg-surface-muted")}
              >
                {inner}
              </button>
            ) : (
              <div key={key} className={SYN_ROW_CLASS}>
                {inner}
              </div>
            );
          }

          if (status === "running") {
            return (
              <div key={key} className={SYN_ROW_CLASS}>
                {label}
                <span className="min-w-0 text-caption leading-relaxed text-text-strong">
                  <WritingDot className="mr-1.5" />
                  {traderBadge}
                  <InlineStream
                    text={agentOf(key)?.streamingChunk ?? ""}
                    fallback={COPY.progress[key]?.[0]}
                    maxChars={120}
                  />
                </span>
              </div>
            );
          }

          return (
            <div key={key} className={SYN_ROW_CLASS}>
              {label}
              <span
                className={cn(
                  "text-caption",
                  status === "error" ? "text-critical" : "text-text-muted",
                )}
              >
                {COPY.phase.status[status]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 리스크 3인 — `.risk-3` 컴팩트 3카드(역할 라벨 + 완료 시 스탠스 태그 + 요약/라이브). */}
      <div className="grid grid-cols-3 gap-1.5">
        {RISK_KEYS.map((key) => {
          const status = statusOf(key);
          const meta = AGENT_META.find((m) => m.key === key)!;
          const content = reports[key];
          const header = (
            <div className="flex items-center justify-between gap-1">
              <span className="text-caption font-extrabold text-text-strong">
                {COPY.phaseDone.riskLabel[key]}
              </span>
              {status === "done" && (
                <span
                  className={cn(
                    "flex-none rounded-sm px-1.5 py-0.5 text-caption font-extrabold",
                    RISK_TAG_TONE[key],
                  )}
                >
                  {COPY.phaseDone.riskTag[key]}
                </span>
              )}
            </div>
          );

          if (status === "done") {
            const preview = content ? stripMarkdown(content) : COPY.phaseDone.emptyPreview;
            const inner = (
              <>
                {header}
                <span className="text-caption leading-snug text-text-muted line-clamp-3">
                  {preview}
                </span>
              </>
            );
            return content ? (
              <button
                key={key}
                type="button"
                onClick={() => onExpand(meta.label, content)}
                className={cn(RISK_CARD_CLASS, "text-left transition-colors hover:border-accent-vivid/40")}
              >
                {inner}
              </button>
            ) : (
              <div key={key} className={RISK_CARD_CLASS}>
                {inner}
              </div>
            );
          }

          return (
            <div key={key} className={RISK_CARD_CLASS}>
              {header}
              {status === "running" ? (
                <span className="text-caption leading-snug text-text-strong">
                  <WritingDot className="mr-1" />
                  <InlineStream
                    text={agentOf(key)?.streamingChunk ?? ""}
                    fallback={COPY.progress[key]?.[0]}
                    maxChars={80}
                  />
                </span>
              ) : (
                <span
                  className={cn(
                    "text-caption leading-snug",
                    status === "error" ? "text-critical" : "text-text-muted",
                  )}
                >
                  {COPY.phase.status[status]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
