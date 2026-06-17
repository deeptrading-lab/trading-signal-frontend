"use client";

import { motion } from "motion/react";
import { ArrowLeft, MessageSquareQuote } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

const PROSE =
  "prose prose-sm prose-slate dark:prose-invert max-w-none " +
  "prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1.5 " +
  "prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-1 " +
  "prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:my-0.5 " +
  "prose-strong:text-slate-800 dark:prose-strong:text-slate-100 " +
  "prose-table:text-xs prose-table:w-full " +
  "prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:font-semibold prose-th:px-2 prose-th:py-1.5 prose-th:text-left " +
  "prose-td:px-2 prose-td:py-1.5 prose-td:border-b prose-td:border-slate-200 dark:prose-td:border-slate-700 " +
  "prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20 prose-code:px-1 prose-code:rounded prose-code:text-[11px] " +
  "prose-hr:border-slate-200 dark:prose-hr:border-slate-700";

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
            <MessageSquareQuote size={15} className="flex-none mt-0.5 text-slate-400 dark:text-slate-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {COPY.sentiment.summaryLabel}
              </p>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{highlight}</p>
            </div>
          </div>
        )}
        <div className={PROSE}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
