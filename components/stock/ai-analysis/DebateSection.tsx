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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{COPY.debate.title}</span>
          <span className="ml-auto text-[10px] text-slate-400 font-medium">
            {COPY.debate.roundCounter(currentRound, DEBATE_ROUNDS)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_28px_1fr] gap-2 mb-3">
          <div className="text-[11px] font-extrabold text-red-600 dark:text-red-400">
            {COPY.debate.bullColumn}
          </div>
          <div />
          <div className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 text-right">
            {COPY.debate.bearColumn}
          </div>
        </div>

        <div className="space-y-3">
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
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">R{round}</span>
                  <div className="flex-1 w-0.5 bg-slate-400 dark:bg-slate-500 min-h-[20px]" />
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
