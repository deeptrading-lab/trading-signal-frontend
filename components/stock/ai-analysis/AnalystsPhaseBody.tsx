"use client";

import { AnalystTile } from "./AnalystTile";
import type {
  AgentKey,
  AgentState,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";

/**
 * ① 분석가 페이즈 본문 — market·news·fundamentals·social 4 타일(병렬).
 * social 타일에만 정형 감성(SentimentBadge)을 곁들인다(SNS 감정은 이 페이즈 소관 — 히어로엔 미노출).
 * 기존 패널 Row1 레이아웃(2×2 → md 4열) 그대로.
 */
const ANALYST_KEYS: AgentKey[] = ["market", "news", "fundamentals", "social"];

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
