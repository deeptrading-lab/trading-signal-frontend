"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import { AGENT_META, DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentState, AgentStatus, DebateMessage } from "@/lib/types/stock/aiAnalysis";
import { DebateMsgCard } from "./DebateMsgCard";
import { StreamPips, StreamBox, type StreamPip } from "./PhaseStream";

interface DebateSectionProps {
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  bullAgent: AgentState;
  bearAgent: AgentState;
  onExpand: (title: string, content: string) => void;
}

/** 공통 헤더 — MessageSquare + 제목 + 라운드 카운터. done/running 뷰가 공유. */
function DebateHeader({ currentRound }: { currentRound: number }) {
  return (
    <div className="flex items-center gap-sm">
      <MessageSquare size={14} className="text-text-muted" />
      <span className="text-body-sm-strong text-text-strong">{COPY.debate.title}</span>
      <span className="ml-auto text-caption text-text-muted">
        {COPY.debate.roundCounter(currentRound, DEBATE_ROUNDS)}
      </span>
    </div>
  );
}

export function DebateSection({
  debate,
  debatingSide,
  bullAgent,
  bearAgent,
  onExpand,
}: DebateSectionProps) {
  const bullMsgs = useMemo(() => debate.filter(d => d.speaker === "bull"), [debate]);
  const bearMsgs = useMemo(() => debate.filter(d => d.speaker === "bear"), [debate]);

  if (bullAgent.status === "pending") return null;

  const currentRound = Math.max(bullMsgs.length, bearMsgs.length, 1);
  const isDone = bullAgent.status === "done" && bearAgent.status === "done";

  // ── 완료(done) — 노스스타 `.round` 세로 스택 버블(R# 좌측 + 강세 위 / 약세 반박 아래). ──
  if (isDone) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-md border-t border-border-line pt-lg">
          <DebateHeader currentRound={currentRound} />

          {/* 노스스타 `.rounds`(세로 gap9) — 라운드마다 `.round`(grid 30px 1fr): R# 박스 + 버블 스택. */}
          <div className="flex flex-col gap-sm">
            {Array.from({ length: DEBATE_ROUNDS }, (_, i) => {
              const round = i + 1;
              const bullMsg = bullMsgs.find(m => m.round === round);
              const bearMsg = bearMsgs.find(m => m.round === round);
              if (!bullMsg && !bearMsg) return null;

              return (
                <div key={round} className="grid grid-cols-[30px_1fr] items-start gap-sm">
                  {/* 노스스타 `.rn` — surface 배경 boxed 라운드 라벨(상단 정렬). */}
                  <span className="rounded-sm bg-surface-muted py-0.5 text-center text-caption font-black text-text-muted">
                    R{round}
                  </span>
                  {/* 노스스타 `.bubbles`(세로 스택, gap6) — 강세 위 / 약세 반박 아래. */}
                  <div className="flex min-w-0 flex-col gap-1.5">
                    {bullMsg && (
                      <DebateMsgCard
                        msg={bullMsg}
                        debatingSide={debatingSide}
                        onExpand={onExpand}
                        whoLabel={COPY.debate.bubbleWho.bull}
                      />
                    )}
                    {bearMsg && (
                      <DebateMsgCard
                        msg={bearMsg}
                        debatingSide={debatingSide}
                        onExpand={onExpand}
                        whoLabel={COPY.debate.bubbleWho.bear}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── 진행/오류(PHASE 2) — 노스스타 stream 모델(발화 pip 4 + 활성 발화 stream-box). ──
  // 토론은 순차(bull R1 → bear R1 → bull R2 → bear R2)라 활성 하나가 자연스럽다. R# 라벨 pip 가 라운드
  // 진행을 담아 별도 eta 없이도 진척이 읽힌다. 활성 발화는 debatingSide 의 스트리밍 메시지.
  const utterancePips: StreamPip[] = [];
  for (let r = 1; r <= DEBATE_ROUNDS; r++) {
    for (const side of ["bull", "bear"] as const) {
      const msg = debate.find((d) => d.round === r && d.speaker === side);
      const agentErrored =
        (side === "bull" ? bullAgent.status : bearAgent.status) === "error";
      const status: AgentStatus =
        msg && !msg.isStreaming
          ? "done"
          : msg && msg.isStreaming
            ? "running"
            : agentErrored
              ? "error"
              : "pending";
      utterancePips.push({
        key: `${r}-${side}`,
        label: `R${r} ${COPY.phase.stream.debatePip[side]}`,
        status,
      });
    }
  }
  const activeMsg = debatingSide
    ? [...debate].reverse().find((d) => d.speaker === debatingSide && d.isStreaming) ?? null
    : null;
  const activeLabel = debatingSide
    ? AGENT_META.find((m) => m.key === debatingSide)?.label
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col gap-md">
        <StreamPips pips={utterancePips} />
        {activeMsg && activeLabel && (
          <StreamBox
            who={COPY.phase.stream.writing(activeLabel)}
            text={activeMsg.content}
            fallback={debatingSide ? COPY.progress[debatingSide]?.[0] : undefined}
          />
        )}
      </div>
    </motion.div>
  );
}
