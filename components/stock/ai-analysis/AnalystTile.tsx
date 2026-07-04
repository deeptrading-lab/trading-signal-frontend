"use client";

import { cn } from "@/lib/utils/cn";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { AnalystCard } from "./AnalystCard";
import type {
  AgentKey,
  AgentState,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";

/**
 * 페이즈 본문에서 반복되는 에이전트 타일 — pending 은 대시 플레이스홀더, 그 외는 `AnalystCard`.
 * 분석가·종합 페이즈가 공유(분석가 4 / 리서치·트레이더 / 리스크 3)해 렌더 규칙을 한 곳에 고정한다.
 * onRetry(resume) 배선을 이 타일이 담당 — 에러 카드의 재개 어포던스를 보존한다.
 */
export function AnalystTile({
  agentKey,
  agents,
  reports,
  isRunning,
  onExpand,
  onResume,
  sentiment,
}: {
  agentKey: AgentKey;
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  isRunning: boolean;
  onExpand: (title: string, content: string, highlight?: string) => void;
  onResume: (key: AgentKey) => void;
  /** social 타일 전용 정형 감성. */
  sentiment?: SentimentReport | null;
}) {
  const meta = AGENT_META.find((m) => m.key === agentKey)!;
  const state = agents.find((a) => a.key === agentKey)!;

  if (state.status === "pending") {
    return (
      <div
        className={cn(
          "h-full min-h-[120px] rounded-md border border-dashed border-border-line bg-surface-muted",
        )}
      />
    );
  }

  return (
    <AnalystCard
      meta={meta}
      status={state.status}
      content={reports[agentKey]}
      streamingChunk={state.streamingChunk}
      isRunning={isRunning}
      onExpand={onExpand}
      onRetry={state.status === "error" ? () => onResume(agentKey) : undefined}
      failReason={state.failReason}
      sentiment={sentiment}
    />
  );
}
