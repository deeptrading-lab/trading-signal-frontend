"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, Check, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentMeta, AgentStatus, AgentFailReason, SentimentReport } from "@/lib/types/stock/aiAnalysis";
import { SentimentBadge } from "./SentimentBadge";

interface AnalystCardProps {
  meta: AgentMeta;
  status: AgentStatus;
  content: string | undefined;
  streamingChunk: string;
  isRunning: boolean;
  onExpand: (title: string, content: string, highlight?: string) => void;
  onRetry?: () => void;
  /** status==="error" 일 때 실패 사유 — 카드에 "응답 시간 초과" 등으로 표시. */
  failReason?: AgentFailReason;
  /** SNS 분석가(social) 카드 전용 — 정형 감성. 그 외 카드에는 전달하지 않음. */
  sentiment?: SentimentReport | null;
}

export const AnalystCard = memo(function AnalystCard({
  meta,
  status,
  content,
  streamingChunk,
  isRunning: globalRunning,
  onExpand,
  onRetry,
  sentiment,
  failReason,
}: AnalystCardProps) {
  const isActive = status === "running";
  const isDone = status === "done";
  const isError = status === "error";
  const displayText = isActive ? streamingChunk : (isDone ? content : undefined);
  // 미리보기는 마크다운 기호를 제거한 평문 teaser(전체보기는 원문 그대로 마크다운 렌더).
  const previewText = displayText ? stripMarkdown(displayText) : displayText;
  // SNS 분석가는 리포트 서두 인사말 대신 '심리 한 줄 요약(summary)'을 미리보기로 노출(있을 때만).
  const summary = sentiment?.summary?.trim() || undefined;
  const donePreview = isDone && summary ? summary : previewText;

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
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm min-h-[120px]"
    >
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex-none",
        isActive && "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
        isDone && "bg-emerald-50/40 dark:bg-emerald-950/10",
      )}>
        {/* 완료 시 점 → 체크 */}
        {isDone ? (
          <Check size={13} className="text-emerald-500 flex-none" />
        ) : (
          <div className={cn(
            "w-1.5 h-1.5 rounded-full flex-none",
            isActive && "bg-blue-500 animate-pulse",
            isError && "bg-red-500",
          )} />
        )}
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-1 truncate">
          {meta.label}
        </span>
        {isActive && <RefreshCw size={11} className="text-blue-500 animate-spin flex-none" />}
        {isError && <AlertCircle size={12} className="text-red-500 flex-none" />}
        {/* 완료 시 — 원래 체크 자리에 전체보기 */}
        {isDone && displayText && (
          <button
            type="button"
            onClick={() => onExpand(meta.label, displayText, summary)}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-0.5 flex-none"
          >
            {COPY.card.viewFull} <ChevronRight size={10} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden px-3 py-2.5">
        {/* SNS 분석가 카드 전용 감성 배지 — done + 파싱 성공 시에만(폴백 시 미표시). */}
        {isDone && sentiment && (
          <div className="mb-2">
            <SentimentBadge report={sentiment} />
          </div>
        )}
        {isActive && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="line-clamp-3 whitespace-pre-wrap">
              {previewText || messages[msgIdx]}
            </span>
            <span className="inline-block w-1 h-[14px] bg-blue-500 animate-pulse ml-0.5 align-middle" />
          </p>
        )}
        {isDone && displayText && (
          <p className={cn(
            "text-[11px] leading-relaxed line-clamp-3 whitespace-pre-wrap",
            // summary 노출 시엔 '결론' 톤으로 약간 진하게, 일반 미리보기는 기존 톤.
            summary
              ? "text-slate-700 dark:text-slate-200 font-medium"
              : "text-slate-600 dark:text-slate-300",
          )}>
            {donePreview}
          </p>
        )}
        {isError && (
          <p className="text-[11px] text-red-500 mt-1">
            {failReason ? COPY.card.failReason[failReason] : COPY.card.error}
          </p>
        )}
      </div>

      {/* 오류 재시도 전용 푸터 (전체보기는 헤더로 이동) */}
      {isError && !globalRunning && onRetry && (
        <div className="flex-none px-3 py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onRetry}
            className="text-[10px] text-red-500 hover:text-red-600 font-medium cursor-pointer flex items-center gap-1"
          >
            <RefreshCw size={10} /> {COPY.card.retry}
          </button>
        </div>
      )}
    </motion.div>
  );
});
