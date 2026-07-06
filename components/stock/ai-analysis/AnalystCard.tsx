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
      // 탈-카드: 그림자·헤더 색띠·헤더 하단선 제거. 흰 패널 위 회색 타일(노스스타 stream-box=surface-2) + 상태 점(dot).
      className="bg-surface-muted rounded-md border border-border-line overflow-hidden flex flex-col min-h-[120px]"
    >
      <div className="flex items-center gap-sm px-md pt-md pb-1 flex-none">
        {/* 완료 시 점 → 체크(노스스타 done 초록). */}
        {isDone ? (
          <Check size={13} className="text-signal-done flex-none" />
        ) : (
          <div className={cn(
            "w-1.5 h-1.5 rounded-full flex-none",
            isActive && "bg-accent-vivid animate-pulse",
            isError && "bg-critical",
          )} />
        )}
        <span className="text-caption font-bold text-text-strong flex-1 truncate">
          {meta.label}
        </span>
        {isActive && <RefreshCw size={11} className="text-accent-vivid animate-spin flex-none" />}
        {isError && <AlertCircle size={12} className="text-critical flex-none" />}
        {/* 완료 시 — 원래 체크 자리에 전체보기 */}
        {isDone && displayText && (
          <button
            type="button"
            onClick={() => onExpand(meta.label, displayText, summary)}
            className="text-caption text-accent-vivid hover:opacity-70 font-medium cursor-pointer flex items-center gap-0.5 flex-none"
          >
            {COPY.card.viewFull} <ChevronRight size={10} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden px-md pb-md">
        {/* SNS 분석가 카드 전용 감성 배지 — done + 파싱 성공 시에만(폴백 시 미표시). */}
        {isDone && sentiment && (
          <div className="mb-2">
            <SentimentBadge report={sentiment} />
          </div>
        )}
        {isActive && (
          <p className="text-caption text-text-muted leading-relaxed">
            <span className="line-clamp-3 whitespace-pre-wrap">
              {previewText || messages[msgIdx]}
            </span>
            <span className="inline-block w-1 h-[14px] bg-accent-vivid animate-pulse ml-0.5 align-middle" />
          </p>
        )}
        {isDone && displayText && (
          <p className={cn(
            "text-caption leading-relaxed line-clamp-3 whitespace-pre-wrap",
            // summary 노출 시엔 '결론' 톤으로 약간 진하게, 일반 미리보기는 기존 톤.
            summary
              ? "text-text-strong font-medium"
              : "text-text-muted",
          )}>
            {donePreview}
          </p>
        )}
        {isError && (
          <p className="text-caption text-critical mt-1">
            {failReason ? COPY.card.failReason[failReason] : COPY.card.error}
          </p>
        )}
      </div>

      {/* 오류 재시도 전용 푸터 (전체보기는 헤더로 이동) */}
      {isError && !globalRunning && onRetry && (
        <div className="flex-none px-md py-sm border-t border-border-line">
          <button
            type="button"
            onClick={onRetry}
            className="text-caption text-critical hover:opacity-70 font-medium cursor-pointer flex items-center gap-1"
          >
            <RefreshCw size={10} /> {COPY.card.retry}
          </button>
        </div>
      )}
    </motion.div>
  );
});
