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
      "rounded-md overflow-hidden",
      isBull ? "bg-signal-up-soft" : "bg-signal-down-soft",
      isStreaming && (isBull ? "ring-1 ring-inset ring-signal-up/40" : "ring-1 ring-inset ring-signal-down/40"),
    )}>
      <div className="flex items-center gap-sm px-md pt-md pb-1">
        {isStreaming && (
          <span className={cn(
            "relative flex h-2 w-2 flex-none",
            isBull ? "text-signal-up" : "text-signal-down",
          )}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
        )}
        <span className={cn(
          "text-caption font-bold flex-1 truncate",
          isBull ? "text-signal-up" : "text-signal-down",
        )}>
          {COPY.debate.roundMarker(msg.round)}
        </span>
        {/* 완료 시 — 헤더 오른쪽에 전체보기 */}
        {!msg.isStreaming && msg.content && (
          <button
            type="button"
            onClick={() => onExpand(COPY.debate.detailTitle(msg.speaker, msg.round), msg.content)}
            className={cn(
              "text-caption font-medium cursor-pointer flex items-center gap-0.5 flex-none hover:opacity-70",
              isBull ? "text-signal-up" : "text-signal-down",
            )}
          >
            {COPY.card.viewFull} <ChevronRight size={10} />
          </button>
        )}
      </div>
      <div className="px-md pb-md">
        {isStreaming ? (
          <p className="text-caption text-text-strong leading-relaxed whitespace-pre-wrap break-words">
            <span className="line-clamp-3">{tailText}</span>
            <span className={cn(
              "inline-block w-1 h-[13px] animate-pulse ml-0.5 align-middle",
              isBull ? "bg-signal-up" : "bg-signal-down",
            )} />
          </p>
        ) : (
          <p className="text-caption text-text-strong leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {previewText}
          </p>
        )}
      </div>
    </div>
  );
}
