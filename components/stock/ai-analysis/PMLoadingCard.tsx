"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

export function PMLoadingCard({ streamingChunk }: { streamingChunk: string }) {
  const messages = COPY.progress.portfolio_manager;
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    if (streamingChunk) { setMsgIdx(0); return; }
    const id = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2400);
    return () => clearInterval(id);
  }, [streamingChunk, messages.length]);

  const tailText = streamingChunk.length > 200 ? "…" + streamingChunk.slice(-200) : streamingChunk;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-800 p-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <RefreshCw size={18} className="text-blue-500 animate-spin" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">최종 결론 도출 중…</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {streamingChunk ? tailText : messages[msgIdx]}
          </p>
        </div>
      </div>
    </div>
  );
}
