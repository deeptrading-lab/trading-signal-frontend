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
      className="absolute inset-0 bg-surface-muted z-10 flex flex-col"
    >
      <div className="flex-none flex items-center gap-md px-lg py-md bg-surface border-b border-border-line">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-caption text-text-muted hover:text-text-strong font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} /> {COPY.overlay.back}
        </button>
        <h3 className="text-body-sm-strong text-text-strong truncate">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-lg">
        {highlight && (
          <div className="mb-4 flex gap-2.5 rounded-md border border-border-line bg-surface px-md py-md">
            <MessageSquareQuote size={15} aria-hidden="true" className="flex-none mt-0.5 text-text-muted" />
            <div className="min-w-0">
              <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                {COPY.sentiment.summaryLabel}
              </p>
              <p className="text-caption leading-relaxed text-text-strong">{highlight}</p>
            </div>
          </div>
        )}
        <MarkdownContent content={content} />
      </div>
    </motion.div>
  );
}
