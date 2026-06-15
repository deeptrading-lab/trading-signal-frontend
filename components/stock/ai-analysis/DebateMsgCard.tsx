"use client";

import { cn } from "@/lib/utils/cn";
import { ChevronRight } from "lucide-react";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { DebateMessage } from "@/lib/types/stock/aiAnalysis";

interface DebateMsgCardProps {
  msg: DebateMessage;
  debatingSide: "bull" | "bear" | null;
  onExpand: (title: string, content: string) => void;
}

export function DebateMsgCard({ msg, debatingSide, onExpand }: DebateMsgCardProps) {
  const isBull = msg.speaker === "bull";
  const isStreaming = msg.isStreaming && debatingSide === msg.speaker;
  // 미리보기는 마크다운 기호를 제거한 평문 teaser(전체보기는 원문 그대로 마크다운 렌더).
  const previewText = stripMarkdown(msg.content);
  const tailText = isStreaming && previewText.length > 250
    ? "…" + previewText.slice(-250)
    : previewText;

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden shadow-sm",
      isBull
        ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-900/40"
        : "bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/40",
      isStreaming && (isBull ? "border-red-400" : "border-blue-400"),
    )}>
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 border-b",
        isBull ? "border-red-200 dark:border-red-900/30" : "border-blue-200 dark:border-blue-900/30",
      )}>
        {isStreaming && (
          <span className="relative flex h-2 w-2 flex-none">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isBull ? "bg-red-400" : "bg-blue-400")} />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", isBull ? "bg-red-500" : "bg-blue-500")} />
          </span>
        )}
        <span className={cn(
          "text-[10px] font-bold flex-1 truncate",
          isBull ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
        )}>
          {COPY.debate.roundMarker(msg.round)}
        </span>
        {/* 완료 시 — 헤더 오른쪽에 전체보기 */}
        {!msg.isStreaming && msg.content && (
          <button
            type="button"
            onClick={() => onExpand(COPY.debate.detailTitle(msg.speaker, msg.round), msg.content)}
            className={cn(
              "text-[10px] font-medium cursor-pointer flex items-center gap-0.5 flex-none",
              isBull ? "text-red-500 hover:text-red-600" : "text-blue-500 hover:text-blue-600",
            )}
          >
            {COPY.card.viewFull} <ChevronRight size={10} />
          </button>
        )}
      </div>
      <div className="px-3 py-2.5">
        {isStreaming ? (
          <p className={cn(
            "text-[11px] leading-relaxed whitespace-pre-wrap break-words",
            isBull ? "text-red-800 dark:text-red-300" : "text-blue-800 dark:text-blue-300",
          )}>
            <span className="line-clamp-3">{tailText}</span>
            <span className={cn("inline-block w-1 h-[13px] animate-pulse ml-0.5 align-middle", isBull ? "bg-red-500" : "bg-blue-500")} />
          </p>
        ) : (
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {previewText}
          </p>
        )}
      </div>
    </div>
  );
}
