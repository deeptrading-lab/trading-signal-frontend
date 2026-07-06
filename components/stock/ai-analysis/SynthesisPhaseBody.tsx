"use client";

import { cn } from "@/lib/utils/cn";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { AnalystTile } from "./AnalystTile";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentKey, AgentState } from "@/lib/types/stock/aiAnalysis";

/**
 * ③ 종합 페이즈 본문 — 리서치 매니저 → 트레이더(심층 추론 배지) → 리스크 3인(공격·중립·보수).
 *
 * - 완료(done, 5인 전부 done): 노스스타 `.syn-row` 납작 행(리서치매니저·트레이더) + `.risk-3` 컴팩트 3카드(공격/중립/보수).
 *   각 행·카드 클릭 → 기존 전체보기 경로(onExpand)로 리포트 전문 펼침. 트레이더 '심층 추론' 배지는 done 뷰에서도 보존.
 * - 진행/대기/오류(그 외): 기존 progressive reveal 타일 그대로(PHASE 1 미변경 — 스트리밍·재시도 보존).
 */
const RISK_KEYS = ["risk_risky", "risk_neutral", "risk_safe"] as const;
const PLAN_KEYS = ["research_manager", "trader"] as const;

/**
 * 리스크 역할별 특성 스탠스 태그 톤(#280 매핑) — 각 검토관의 고정 렌즈를 나타낸다(종목별 판정 아님, COPY.phaseDone.riskTag 주석 참조).
 * 매수=signal-up/up-soft · 조건부=warn/warn-soft · 주의=text-muted/surface(카드 bg=surface-muted 위 흰 pill).
 */
const RISK_TAG_TONE: Record<(typeof RISK_KEYS)[number], string> = {
  risk_risky: "bg-signal-up-soft text-signal-up",
  risk_neutral: "bg-warn-soft text-warn",
  risk_safe: "bg-surface text-text-muted",
};

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
  const allDone =
    PLAN_KEYS.every((k) => statusOf(k) === "done") &&
    RISK_KEYS.every((k) => statusOf(k) === "done");

  // ── 완료(done) — 노스스타 `.syn-row` 납작 행 + `.risk-3` 컴팩트 3카드. ──
  if (allDone) {
    return (
      <div className="space-y-3">
        {/* 리서치매니저 · 트레이더 — `.syn-row`(라벨 82px + 한 줄 요약). */}
        <div className="flex flex-col">
          {PLAN_KEYS.map((key) => {
            const meta = AGENT_META.find((m) => m.key === key)!;
            const content = reports[key];
            const preview = content ? stripMarkdown(content) : COPY.phaseDone.emptyPreview;
            const inner = (
              <>
                <span className="text-caption font-bold text-text-muted">
                  {COPY.phaseDone.synLabel[key]}
                </span>
                <span className="min-w-0 text-caption leading-relaxed text-text-strong line-clamp-2">
                  {key === "trader" && (
                    // 심층 추론 배지 — done 뷰에서도 보존(gradient-ai 인디고 톤). 인라인 span 으로 line-clamp 안에서 흐르게.
                    <span className="mr-1 rounded-pill bg-gradient-ai-soft px-1.5 py-0.5 align-middle text-caption font-bold text-gradient-ai-from">
                      {COPY.panel.deepReasoning}
                    </span>
                  )}
                  {preview}
                </span>
              </>
            );
            return content ? (
              <button
                key={key}
                type="button"
                onClick={() => onExpand(meta.label, content)}
                className="grid grid-cols-[82px_1fr] items-baseline gap-md rounded-sm px-1.5 py-1.5 text-left transition-colors hover:bg-surface-muted"
              >
                {inner}
              </button>
            ) : (
              <div
                key={key}
                className="grid grid-cols-[82px_1fr] items-baseline gap-md px-1.5 py-1.5"
              >
                {inner}
              </div>
            );
          })}
        </div>

        {/* 리스크 3인 — `.risk-3` 컴팩트 3카드(역할 라벨 + 스탠스 태그 + 요약). */}
        <div className="grid grid-cols-3 gap-1.5">
          {RISK_KEYS.map((key) => {
            const meta = AGENT_META.find((m) => m.key === key)!;
            const content = reports[key];
            const preview = content ? stripMarkdown(content) : COPY.phaseDone.emptyPreview;
            const inner = (
              <>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-caption font-extrabold text-text-strong">
                    {COPY.phaseDone.riskLabel[key]}
                  </span>
                  <span
                    className={cn(
                      "flex-none rounded-sm px-1.5 py-0.5 text-caption font-extrabold",
                      RISK_TAG_TONE[key],
                    )}
                  >
                    {COPY.phaseDone.riskTag[key]}
                  </span>
                </div>
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
                className="flex flex-col gap-1 rounded-sm border border-border-line bg-surface-muted px-2 py-2 text-left transition-colors hover:border-accent-vivid/40"
              >
                {inner}
              </button>
            ) : (
              <div
                key={key}
                className="flex flex-col gap-1 rounded-sm border border-border-line bg-surface-muted px-2 py-2"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 진행/대기/오류(running) — 기존 progressive reveal 타일 그대로(PHASE 1 미변경). ──
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
