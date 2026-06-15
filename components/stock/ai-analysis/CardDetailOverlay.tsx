"use client";

import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
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
  onClose: () => void;
}

export function CardDetailOverlay({ title, content, onClose }: CardDetailOverlayProps) {
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
        <div className={PROSE}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
