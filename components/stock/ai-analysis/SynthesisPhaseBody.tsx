"use client";

import { AnalystTile } from "./AnalystTile";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentKey, AgentState } from "@/lib/types/stock/aiAnalysis";

/**
 * ③ 종합 페이즈 본문 — 리서치 매니저 → 트레이더(심층 추론 배지) → 리스크 3인(공격·중립·보수).
 * 기존 패널 Row3-4(2열) + Row5(모바일 스냅 캐러셀 / md 3열) 레이아웃 그대로. 진행 순서를 살리려
 * 하위 섹션은 각자 "일부 non-pending" 가드로 점진 노출한다.
 */
const RISK_KEYS: AgentKey[] = ["risk_risky", "risk_neutral", "risk_safe"];

export function SynthesisPhaseBody({
  agents,
  reports,
  isRunning,
  onExpand,
  onResume,
}: {
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  isRunning: boolean;
  onExpand: (title: string, content: string, highlight?: string) => void;
  onResume: (key: AgentKey) => void;
}) {
  const statusOf = (key: AgentKey) => agents.find((a) => a.key === key)?.status ?? "pending";
  const showPlan = statusOf("research_manager") !== "pending" || statusOf("trader") !== "pending";
  const showRisk = RISK_KEYS.some((k) => statusOf(k) !== "pending");
  const traderPending = statusOf("trader") === "pending";

  return (
    <div className="space-y-3">
      {/* 리서치 매니저 + 트레이더(심층 추론 배지) */}
      {showPlan && (
        <div className="grid grid-cols-2 gap-3">
          <AnalystTile
            agentKey="research_manager"
            agents={agents}
            reports={reports}
            isRunning={isRunning}
            onExpand={onExpand}
            onResume={onResume}
          />
          {traderPending ? (
            <AnalystTile
              agentKey="trader"
              agents={agents}
              reports={reports}
              isRunning={isRunning}
              onExpand={onExpand}
              onResume={onResume}
            />
          ) : (
            <div className="relative">
              {/* AI 시그니처 — 심층 추론 배지는 gradient-ai 인디고 톤(브랜드 강조). */}
              <span className="absolute -top-3.5 right-3 z-10 rounded-pill bg-gradient-ai-soft px-2 py-0.5 text-caption font-bold text-gradient-ai-from">
                {COPY.panel.deepReasoning}
              </span>
              <AnalystTile
                agentKey="trader"
                agents={agents}
                reports={reports}
                isRunning={isRunning}
                onExpand={onExpand}
                onResume={onResume}
              />
            </div>
          )}
        </div>
      )}

      {/* 리스크 3인 — 모바일 스냅 캐러셀(다음 카드 peek), md+ 3열 그리드. */}
      {showRisk && (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide-mobile md:grid md:grid-cols-3 md:overflow-visible">
          {RISK_KEYS.map((key) => (
            <div key={key} className="snap-start w-[78%] shrink-0 sm:w-[46%] md:w-auto">
              <AnalystTile
                agentKey={key}
                agents={agents}
                reports={reports}
                isRunning={isRunning}
                onExpand={onExpand}
                onResume={onResume}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
