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
      "rounded-xl border px-3 py-3",
      isBull
        ? "border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10"
        : "border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10",
    )}>
      <p className={cn(
        "text-[11px] flex items-center gap-1.5",
        isBull ? "text-red-500" : "text-blue-500",
      )}>
        <span className="relative flex h-2 w-2 flex-none">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isBull ? "bg-red-400" : "bg-blue-400")} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", isBull ? "bg-red-500" : "bg-blue-500")} />
        </span>
        {messages[msgIdx]}
      </p>
    </div>
  );
}
