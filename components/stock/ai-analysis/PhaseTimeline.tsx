"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import {
  PHASES,
  derivePhaseStatus,
  phaseProgress,
  phaseResumeKey,
  phaseFailReason,
  type PhaseKey,
  type PhaseStatus,
} from "@/lib/types/stock/aiPhases";
import { PhaseRow } from "./PhaseRow";
import { AnalystsPhaseBody } from "./AnalystsPhaseBody";
import { DebateSection } from "./DebateSection";
import { SynthesisPhaseBody } from "./SynthesisPhaseBody";
import { VerdictPhaseBody } from "./VerdictPhaseBody";
import type {
  AgentKey,
  AgentState,
  AgentStatus,
  DebateMessage,
  FinalDecision,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";

/**
 * AI 종합분석 라이브 본문 — 회색 12-칩 스트립을 대체하는 4-페이즈 타임라인.
 *
 * 페이즈 상태(대기/진행/완료/오류)는 `aiPhases` 순수 로직으로 멤버 에이전트에서 파생하고,
 * **진행·오류 페이즈는 자동 펼침**(스트리밍 노출), 완료는 접힘 요약(사용자 재펼침 가능). 최종 판정은
 * 결과 도착 시 자동 펼침(전체 카드). 스트리밍 토큰·per-에이전트 재시도는 기존 서브컴포넌트가 그대로 그린다.
 *
 * 자동 펼침 vs 사용자 토글: `overrides` 가 있으면 사용자 선택 우선, 없으면 상태 기반 auto.
 */

interface PhaseTimelineProps {
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  sentiment: SentimentReport | null;
  final: FinalDecision | null;
  isRunning: boolean;
  onExpand: (title: string, content: string, highlight?: string) => void;
  resume: (key: AgentKey) => void;
}

/** 서브 에이전트 진행 pip(장식) — 완료 체크 / 진행 맥박 / 오류·대기 점. */
function Pip({ status }: { status: AgentStatus }) {
  return (
    <span className="flex h-3 w-3 items-center justify-center">
      {status === "done" ? (
        <Check size={12} className="text-accent-vivid" />
      ) : (
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            status === "running" && "animate-pulse bg-accent-vivid",
            status === "error" && "bg-critical",
            status === "pending" && "border border-border-line",
          )}
        />
      )}
    </span>
  );
}

/** 페이즈 상태 → auto 펼침 여부. 진행·오류·(결과 도착한 최종 판정)이면 펼친다. */
function autoExpanded(key: PhaseKey, status: PhaseStatus, hasFinal: boolean): boolean {
  if (status === "running" || status === "error") return true;
  if (key === "verdict" && hasFinal) return true;
  return false;
}

export function PhaseTimeline({
  agents,
  reports,
  debate,
  debatingSide,
  sentiment,
  final,
  isRunning,
  onExpand,
  resume,
}: PhaseTimelineProps) {
  const [overrides, setOverrides] = useState<Partial<Record<PhaseKey, boolean>>>({});

  const phaseStates = PHASES.map((phase) => ({
    phase,
    status: derivePhaseStatus(agents, phase),
    progress: phaseProgress(agents, phase),
  }));

  // 자동 스크롤 타깃 — 진행 중 페이즈(없으면 결과 도착 시 최종 판정).
  const runningKey = phaseStates.find((p) => p.status === "running")?.phase.key ?? null;
  const activeKey: PhaseKey | null = runningKey ?? (final ? "verdict" : null);

  const renderBody = (key: PhaseKey) => {
    switch (key) {
      case "analysts":
        return (
          <AnalystsPhaseBody
            agents={agents}
            reports={reports}
            sentiment={sentiment}
            isRunning={isRunning}
            onExpand={onExpand}
            onResume={resume}
          />
        );
      case "debate":
        return (
          <DebateSection
            debate={debate}
            debatingSide={debatingSide}
            bullAgent={agents.find((a) => a.key === "bull")!}
            bearAgent={agents.find((a) => a.key === "bear")!}
            onExpand={onExpand}
          />
        );
      case "synthesis":
        return (
          <SynthesisPhaseBody
            agents={agents}
            reports={reports}
            isRunning={isRunning}
            onExpand={onExpand}
            onResume={resume}
          />
        );
      case "verdict":
        return (
          <VerdictPhaseBody
            final={final}
            pmAgent={agents.find((a) => a.key === "portfolio_manager")!}
          />
        );
    }
  };

  return (
    <div>
      {phaseStates.map(({ phase, status, progress }, i) => {
        const isLast = i === PHASES.length - 1;
        const canExpand = status !== "pending";
        const expanded = overrides[phase.key] ?? autoExpanded(phase.key, status, !!final);
        const desc = COPY.phase.desc[phase.key];
        const showCount =
          phase.agents.length > 1 && (status === "running" || status === "error");
        const summary = showCount
          ? `${desc} · ${COPY.phase.progress(progress.done, progress.total)}`
          : desc;
        const pips =
          phase.agents.length > 1 ? (
            <span className="flex items-center gap-1">
              {phase.agents.map((k) => (
                <Pip key={k} status={agents.find((a) => a.key === k)?.status ?? "pending"} />
              ))}
            </span>
          ) : undefined;

        return (
          <PhaseRow
            key={phase.key}
            label={COPY.phase.label[phase.key]}
            status={status}
            statusText={COPY.phase.status[status]}
            summary={summary}
            pips={pips}
            isExpanded={expanded}
            canExpand={canExpand}
            onToggle={() =>
              setOverrides((o) => ({ ...o, [phase.key]: !expanded }))
            }
            isLast={isLast}
            isActive={phase.key === activeKey}
            error={
              status === "error"
                ? {
                    failReason: phaseFailReason(agents, phase),
                    onResume: () => {
                      const key = phaseResumeKey(agents, phase);
                      if (key) resume(key);
                    },
                    canResume: !isRunning,
                  }
                : undefined
            }
          >
            {renderBody(phase.key)}
          </PhaseRow>
        );
      })}
    </div>
  );
}
