"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

export function DebateLoadingCard({ side }: { side: "bull" | "bear" }) {
  const isBull = side === "bull";
  const messages = COPY.progress[side];
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2400);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className={cn(
      // 노스스타 `.bub`(radius8·border1) 정합 — 로딩 버블도 방향 톤 테두리를 공유.
      "rounded-sm border px-md py-md",
      isBull ? "border-signal-up/20 bg-signal-up-soft" : "border-signal-down/20 bg-signal-down-soft",
    )}>
      <p className={cn(
        "text-caption flex items-center gap-sm",
        isBull ? "text-signal-up" : "text-signal-down",
      )}>
        <span className="relative flex h-2 w-2 flex-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
        {messages[msgIdx]}
      </p>
    </div>
  );
}
