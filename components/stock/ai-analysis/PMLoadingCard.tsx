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
    // 탈-카드: 흰 박스 → 옅은 accent 타일 + 인라인 스피너(진행 표시). 최종 결론 payoff 직전 단계.
    <div className="flex items-center gap-md rounded-md bg-accent-vivid-soft px-md py-md">
      <RefreshCw size={16} className="text-accent-vivid animate-spin flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm-strong text-text-strong">{COPY.verdict.pmLoading}</p>
        <p className="text-caption text-text-muted mt-0.5">
          {streamingChunk ? tailText : messages[msgIdx]}
        </p>
      </div>
    </div>
  );
}
