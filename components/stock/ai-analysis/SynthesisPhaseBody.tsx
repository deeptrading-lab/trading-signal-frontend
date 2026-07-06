"use client";

import { cn } from "@/lib/utils/cn";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { StreamPips, StreamBox, StreamEta, activeStreamAgent } from "./PhaseStream";
import type { AgentKey, AgentState } from "@/lib/types/stock/aiAnalysis";

/**
 * ③ 종합 페이즈 본문 — 리서치 매니저 → 트레이더(심층 추론 배지) → 리스크 3인(공격·중립·보수).
 *
 * - 완료(done, 5인 전부 done): 노스스타 `.syn-row` 납작 행(리서치매니저·트레이더) + `.risk-3` 컴팩트 3카드(공격/중립/보수).
 *   각 행·카드 클릭 → 기존 전체보기 경로(onExpand)로 리포트 전문 펼침. 트레이더 '심층 추론' 배지는 done 뷰에서도 보존.
 * - 진행/대기/오류(그 외, PHASE 2): 노스스타 stream 모델 — pip 5개(전원 상태) + stream-box(활성 하나) + eta.
 *   리서치매니저→트레이더는 순차, 리스크 3인은 병렬(Promise.allSettled)이라 activeStreamAgent 로 활성 하나를
 *   고른다. 오류·재개는 상위 PhaseRow 어포던스가 담당.
 */
const RISK_KEYS = ["risk_risky", "risk_neutral", "risk_safe"] as const;
const PLAN_KEYS = ["research_manager", "trader"] as const;
/** pip·활성 선택 순서 — 실행 순서(리서치매니저 → 트레이더 → 리스크 3). */
const SYN_KEYS = [...PLAN_KEYS, ...RISK_KEYS] as const;

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
  onExpand,
}: {
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  onExpand: (title: string, content: string, highlight?: string) => void;
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

  // ── 진행/대기/오류(PHASE 2) — 노스스타 stream 모델(pip 5개 + 활성 stream-box + eta). ──
  const pips = SYN_KEYS.map((key) => ({
    key,
    label: COPY.phase.stream.synPip[key],
    status: statusOf(key),
  }));
  const doneCount = pips.filter((p) => p.status === "done").length;
  const active = activeStreamAgent(agents, SYN_KEYS);
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
      <StreamEta done={doneCount} total={SYN_KEYS.length} />
    </div>
  );
}
