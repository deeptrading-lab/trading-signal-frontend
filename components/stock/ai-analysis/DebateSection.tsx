"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import { DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentState, DebateMessage } from "@/lib/types/stock/aiAnalysis";
import { DebateLoadingCard } from "./DebateLoadingCard";
import { DebateMsgCard } from "./DebateMsgCard";

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
  const completedBullRounds = useMemo(() => bullMsgs.filter(m => !m.isStreaming).length, [bullMsgs]);
  const completedBearRounds = useMemo(() => bearMsgs.filter(m => !m.isStreaming).length, [bearMsgs]);

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

  // ── 진행/오류(running) — 기존 좌우 대치(강세 | R# | 약세) + 스트리밍·게이팅 로직 그대로(PHASE 1 미변경). ──
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* 탈-카드: 바깥 박스를 걷어내고 헤더 + 여백으로만 구분(토론 메시지 타일이 강세/약세 tint 로 구분). */}
      <div className="flex flex-col gap-md border-t border-border-line pt-lg">
        <DebateHeader currentRound={currentRound} />

        <div className="grid grid-cols-[1fr_28px_1fr] gap-sm">
          <div className="text-caption font-extrabold text-signal-up">
            {COPY.debate.bullColumn}
          </div>
          <div />
          <div className="text-caption font-extrabold text-signal-down text-right">
            {COPY.debate.bearColumn}
          </div>
        </div>

        <div className="space-y-md">
          {Array.from({ length: DEBATE_ROUNDS }, (_, i) => {
            const round = i + 1;
            const bullMsg = bullMsgs.find(m => m.round === round);
            const bearMsg = bearMsgs.find(m => m.round === round);

            const isBullThisRound =
              bullAgent.status === "running" &&
              !bullMsg &&
              round === completedBullRounds + 1 &&
              completedBearRounds === round - 1;
            const isBearThisRound =
              bearAgent.status === "running" &&
              !bearMsg &&
              round === completedBearRounds + 1 &&
              completedBullRounds === round;

            if (!bullMsg && !isBullThisRound && !bearMsg && !isBearThisRound) return null;

            return (
              <div key={round} className="grid grid-cols-[1fr_28px_1fr] gap-1 items-stretch">
                <div>
                  {bullMsg && (
                    <DebateMsgCard msg={bullMsg} debatingSide={debatingSide} onExpand={onExpand} />
                  )}
                  {isBullThisRound && !bullMsg && <DebateLoadingCard side="bull" />}
                </div>
                <div className="flex flex-col items-center gap-1 py-1">
                  {/* 노스스타 `.rn` — surface 배경 boxed 라운드 라벨(10.5px w800 muted). */}
                  <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption font-black text-text-muted">R{round}</span>
                  <div className="flex-1 w-px bg-border-line min-h-[20px]" />
                </div>
                <div>
                  {bearMsg && (
                    <DebateMsgCard msg={bearMsg} debatingSide={debatingSide} onExpand={onExpand} />
                  )}
                  {isBearThisRound && !bearMsg && <DebateLoadingCard side="bear" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
