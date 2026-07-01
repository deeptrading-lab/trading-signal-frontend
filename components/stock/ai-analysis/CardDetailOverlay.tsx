"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { ArrowLeft, MessageSquareQuote } from "lucide-react";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

/**
 * 마크다운 본문은 별도 청크로 지연 로드 — react-markdown + remark-gfm(≈39kB gzip)을 패널 청크에서
 * 분리(perf WS-1). 상세 카드를 펼치기 전까지 로드 안 됨. 청크 로드 중 스켈레톤 표시.
 */
const MarkdownContent = dynamic(
  () => import("./MarkdownContent").then((m) => m.MarkdownContent),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2" aria-hidden="true">
        <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-surface-muted" />
      </div>
    ),
  },
);

interface CardDetailOverlayProps {
  title: string;
  content: string;
  /** 상단 강조 콜아웃(예: SNS 분석가의 '심리 한 줄 요약'). 있을 때만 렌더. */
  highlight?: string;
  onClose: () => void;
}

export function CardDetailOverlay({ title, content, highlight, onClose }: CardDetailOverlayProps) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="absolute inset-0 bg-slate-50 dark:bg-slate-950 z-10 flex flex-col"
    >
      <div className="flex-none flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} /> {COPY.overlay.back}
        </button>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {highlight && (
          <div className="mb-4 flex gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 px-3.5 py-3">
            <MessageSquareQuote size={15} aria-hidden="true" className="flex-none mt-0.5 text-slate-400 dark:text-slate-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {COPY.sentiment.summaryLabel}
              </p>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{highlight}</p>
            </div>
          </div>
        )}
        <MarkdownContent content={content} />
      </div>
    </motion.div>
  );
}
