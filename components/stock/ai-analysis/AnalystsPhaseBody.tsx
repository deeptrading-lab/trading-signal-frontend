"use client";

import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { SentimentBadge } from "./SentimentBadge";
import { StreamPips, StreamBox, StreamEta, activeStreamAgent } from "./PhaseStream";
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
 * - 진행/대기/오류(그 외, PHASE 2): 노스스타 stream 모델 — pip 4개(전원 상태) + stream-box(활성 분석가 하나) + eta.
 *   4인은 병렬 스트리밍이라 '단일 활성'이 없어, pip 가 전원 상태를 담고 stream-box 는 지금 가장 활발한 분석가
 *   하나를 `.sbx-who` 로 표기한다(activeStreamAgent). 오류·재개는 상위 PhaseRow 어포던스가 일괄 담당.
 *
 * social 의 정형 감성(SentimentBadge)은 완료 뷰에서 4행 아래 `.row-hint` 로 곁들인다.
 */
const ANALYST_KEYS = ["market", "news", "fundamentals", "social"] as const;

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
  const allDone = ANALYST_KEYS.every(
    (k) => agents.find((a) => a.key === k)?.status === "done",
  );

  // ── 진행/대기/오류(PHASE 2) — 노스스타 stream 모델(pip + 활성 stream-box + eta). ──
  if (!allDone) {
    const pips = ANALYST_KEYS.map((key) => ({
      key,
      label: COPY.phaseDone.analystLabel[key],
      status: agents.find((a) => a.key === key)?.status ?? "pending",
    }));
    const doneCount = pips.filter((p) => p.status === "done").length;
    const active = activeStreamAgent(agents, ANALYST_KEYS);
    const activeMeta = active ? AGENT_META.find((m) => m.key === active.key) : null;

    return (
      <div className="flex flex-col gap-md">
        <StreamPips pips={pips} />
        {active && activeMeta && (
          <StreamBox
            who={COPY.phase.stream.writing(activeMeta.label)}
            text={active.streamingChunk}
            fallback={COPY.progress[active.key]?.[0]}
          />
        )}
        <StreamEta done={doneCount} total={ANALYST_KEYS.length} />
      </div>
    );
  }

  // 완료 — 노스스타 `.agent-row` 납작 4행 + `.row-hint`.
  return (
    <div className="flex flex-col">
      {ANALYST_KEYS.map((key) => {
        const meta = AGENT_META.find((m) => m.key === key)!;
        const content = reports[key] ?? "";
        // SNS 는 리포트 서두 대신 '심리 한 줄 요약'을 미리보기로(있을 때만) 노출.
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
