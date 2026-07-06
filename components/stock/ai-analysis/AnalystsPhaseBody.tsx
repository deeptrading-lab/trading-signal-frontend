"use client";

import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { AnalystTile } from "./AnalystTile";
import { SentimentBadge } from "./SentimentBadge";
import type {
  AgentKey,
  AgentState,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";

/**
 * ① 분석가 페이즈 본문 — market·news·fundamentals·social 4인(병렬).
 *
 * - 완료(done, 4인 전부 done): 노스스타 `.agent-row` 납작 4행(라벨 66px + 한 줄 요약) + `.row-hint`(감정 칩 + 안내).
 *   각 행 클릭 → 기존 전체보기 경로(onExpand → CardDetailOverlay)로 리포트 전문 펼침. social 요약은 강조 콜아웃으로 전달.
 * - 진행/대기/오류(그 외): 기존 AnalystTile 4타일 그대로(PHASE 1 미변경 — 스트리밍·재시도 보존). PHASE 2에서 stream-box+pip 처리.
 *
 * social 의 정형 감성(SentimentBadge)은 완료 뷰에선 4행 아래 `.row-hint` 로, 진행 뷰에선 기존 social 타일 안으로 곁들인다.
 */
const ANALYST_KEYS = ["market", "news", "fundamentals", "social"] as const;

export function AnalystsPhaseBody({
  agents,
  reports,
  sentiment,
  isRunning,
  onExpand,
  onResume,
}: {
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  sentiment: SentimentReport | null;
  isRunning: boolean;
  onExpand: (title: string, content: string, highlight?: string) => void;
  onResume: (key: AgentKey) => void;
}) {
  const allDone = ANALYST_KEYS.every(
    (k) => agents.find((a) => a.key === k)?.status === "done",
  );

  // 진행/대기/오류 — 기존 4 타일 그대로(스트리밍 보존).
  if (!allDone) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ANALYST_KEYS.map((key) => (
          <AnalystTile
            key={key}
            agentKey={key}
            agents={agents}
            reports={reports}
            isRunning={isRunning}
            onExpand={onExpand}
            onResume={onResume}
            sentiment={key === "social" ? sentiment : undefined}
          />
        ))}
      </div>
    );
  }

  // 완료 — 노스스타 `.agent-row` 납작 4행 + `.row-hint`.
  return (
    <div className="flex flex-col">
      {ANALYST_KEYS.map((key) => {
        const meta = AGENT_META.find((m) => m.key === key)!;
        const content = reports[key] ?? "";
        // SNS 는 리포트 서두 대신 '심리 한 줄 요약'을 미리보기로(있을 때만) — 기존 AnalystCard donePreview 규칙 유지.
        const summary =
          key === "social" ? sentiment?.summary?.trim() || undefined : undefined;
        const teaser = content ? stripMarkdown(content) : "";
        const preview = summary || teaser || COPY.phaseDone.emptyPreview;
        const canExpand = Boolean(content);

        const rowInner = (
          <>
            <span className="text-caption font-bold text-text-muted">
              {COPY.phaseDone.analystLabel[key]}
            </span>
            <span className="min-w-0 text-caption leading-relaxed text-text-strong line-clamp-2">
              {preview}
            </span>
          </>
        );

        return canExpand ? (
          <button
            key={key}
            type="button"
            onClick={() => onExpand(meta.label, content, summary)}
            className="grid grid-cols-[66px_1fr] items-baseline gap-md rounded-sm px-1.5 py-1.5 text-left transition-colors hover:bg-surface-muted"
          >
            {rowInner}
          </button>
        ) : (
          <div
            key={key}
            className="grid grid-cols-[66px_1fr] items-baseline gap-md px-1.5 py-1.5"
          >
            {rowInner}
          </div>
        );
      })}

      {/* 노스스타 `.row-hint` — 감정 칩(정형 감성) + 전문 펼침 안내. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-1.5">
        {sentiment && <SentimentBadge report={sentiment} />}
        <span className="text-caption text-text-muted">{COPY.phaseDone.rowHint}</span>
      </div>
    </div>
  );
}
