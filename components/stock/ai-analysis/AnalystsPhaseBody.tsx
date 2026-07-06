"use client";

import { cn } from "@/lib/utils/cn";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { SentimentBadge } from "./SentimentBadge";
import { InlineStream } from "./PhaseStream";
import type {
  AgentKey,
  AgentState,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";

/**
 * ① 분석가 페이즈 본문 — market·news·fundamentals·social 4인(병렬).
 *
 * 진행/완료가 **같은 flat 4행**(`grid-cols-[66px_1fr]`)을 그리고, 각 행이 자기 상태를 인라인으로 노출한다.
 *   - done: 라벨 + 한 줄 요약(클릭 → 전체보기 오버레이). social 은 정형 심리 한 줄 요약을 미리보기로.
 *   - running: 라벨 + 맥박 점 + **라이브 토큰 미리보기**(해당 agent streamingChunk 끝부분 + accent 커서).
 *     4인이 병렬 스트리밍이라 4행이 **동시에 각자** 흐른다(단일 활성 표기의 한계 해소).
 *   - pending/error: 라벨 + 상태(대기/오류). 오류 재개는 상위 PhaseRow 어포던스가 일괄 담당.
 *
 * social 의 정형 감성(SentimentBadge)은 4행 아래 `.row-hint` 로 곁들인다(도착 시점부터).
 */
const ANALYST_KEYS = ["market", "news", "fundamentals", "social"] as const;

/** 진행중 라이브 행·완료 요약 행이 공유하는 그리드(라벨 66px + 내용). */
const ROW_CLASS = "grid grid-cols-[66px_1fr] items-baseline gap-md px-1.5 py-1.5";

export function AnalystsPhaseBody({
  agents,
  reports,
  sentiment,
  onExpand,
}: {
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  sentiment: SentimentReport | null;
  onExpand: (title: string, content: string, highlight?: string) => void;
}) {
  const anyExpandable = ANALYST_KEYS.some((k) => Boolean(reports[k]));

  return (
    <div className="flex flex-col">
      {ANALYST_KEYS.map((key) => {
        const agent = agents.find((a) => a.key === key);
        const status = agent?.status ?? "pending";
        const meta = AGENT_META.find((m) => m.key === key)!;
        const content = reports[key] ?? "";
        // SNS 는 리포트 서두 대신 '심리 한 줄 요약'을 미리보기로(있을 때만).
        const summary =
          key === "social" ? sentiment?.summary?.trim() || undefined : undefined;

        const label = (
          <span className="text-caption font-bold text-text-muted">
            {COPY.phaseDone.analystLabel[key]}
          </span>
        );

        // ── done — 라벨 + 한 줄 요약(클릭 → 전체보기). ──
        if (status === "done") {
          const teaser = content ? stripMarkdown(content) : "";
          const preview = summary || teaser || COPY.phaseDone.emptyPreview;
          const rowInner = (
            <>
              {label}
              <span className="min-w-0 text-caption leading-relaxed text-text-strong line-clamp-2">
                {preview}
              </span>
            </>
          );
          return content ? (
            <button
              key={key}
              type="button"
              onClick={() => onExpand(meta.label, content, summary)}
              className={cn(ROW_CLASS, "rounded-sm text-left transition-colors hover:bg-surface-muted")}
            >
              {rowInner}
            </button>
          ) : (
            <div key={key} className={ROW_CLASS}>
              {rowInner}
            </div>
          );
        }

        // ── running — 라벨 + 맥박 점 + 라이브 토큰(끝부분 + 커서). ──
        if (status === "running") {
          return (
            <div key={key} className={ROW_CLASS}>
              {label}
              <span className="min-w-0 text-caption leading-relaxed text-text-strong">
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-vivid align-middle animate-pulse motion-reduce:animate-none"
                />
                <InlineStream
                  text={agent?.streamingChunk ?? ""}
                  fallback={COPY.progress[key]?.[0]}
                  maxChars={120}
                />
              </span>
            </div>
          );
        }

        // ── pending / error — 라벨 + 상태 텍스트(대기/오류). ──
        return (
          <div key={key} className={ROW_CLASS}>
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

      {/* 노스스타 `.row-hint` — 감정 칩(정형 감성) + 전문 펼침 안내. 도착·완료분이 있을 때만. */}
      {(sentiment || anyExpandable) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-1.5">
          {sentiment && <SentimentBadge report={sentiment} />}
          <span className="text-caption text-text-muted">{COPY.phaseDone.rowHint}</span>
        </div>
      )}
    </div>
  );
}
