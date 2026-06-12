"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, Check, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentMeta, AgentStatus } from "@/lib/types/stock/aiAnalysis";

interface AnalystCardProps {
  meta: AgentMeta;
  status: AgentStatus;
  content: string | undefined;
  streamingChunk: string;
  isRunning: boolean;
  onExpand: (title: string, content: string) => void;
  onRetry?: () => void;
}

export const AnalystCard = memo(function AnalystCard({
  meta,
  status,
  content,
  streamingChunk,
  isRunning: globalRunning,
  onExpand,
  onRetry,
}: AnalystCardProps) {
  const isActive = status === "running";
  const isDone = status === "done";
  const isError = status === "error";
  const displayText = isActive ? streamingChunk : (isDone ? content : undefined);

  const messages = COPY.progress[meta.key as keyof typeof COPY.progress] ?? [COPY.card.analyzing];
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    if (!isActive || streamingChunk) { setMsgIdx(0); return; }
    const id = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2400);
    return () => clearInterval(id);
  }, [isActive, streamingChunk, messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm min-h-[180px]"
    >
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex-none",
        isActive && "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
        isDone && "bg-emerald-50/40 dark:bg-emerald-950/10",
      )}>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full flex-none",
          isActive && "bg-blue-500 animate-pulse",
          isDone && "bg-emerald-500",
          isError && "bg-red-500",
        )} />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-1 truncate">
          {meta.label}
        </span>
        {isActive && <RefreshCw size={11} className="text-blue-500 animate-spin flex-none" />}
        {isDone && <Check size={12} className="text-emerald-500 flex-none" />}
        {isError && <AlertCircle size={12} className="text-red-500 flex-none" />}
      </div>

      <div className="flex-1 overflow-hidden px-3 py-2.5">
        {isActive && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="line-clamp-5 whitespace-pre-wrap">
              {displayText || messages[msgIdx]}
            </span>
            <span className="inline-block w-1 h-[14px] bg-blue-500 animate-pulse ml-0.5 align-middle" />
          </p>
        )}
        {isDone && displayText && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-5 whitespace-pre-wrap">
            {displayText}
          </p>
        )}
        {isError && (
          <p className="text-[11px] text-red-500 mt-1">{COPY.card.error}</p>
        )}
      </div>

      <div className="flex-none px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div>
          {isError && !globalRunning && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[10px] text-red-500 hover:text-red-600 font-medium cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={10} /> {COPY.card.retry}
            </button>
          )}
        </div>
        {isDone && displayText && (
          <button
            type="button"
            onClick={() => onExpand(meta.label, displayText)}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1 ml-auto"
          >
            {COPY.card.viewFull} <ChevronRight size={10} />
          </button>
        )}
      </div>
    </motion.div>
  );
});
