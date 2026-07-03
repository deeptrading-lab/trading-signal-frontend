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
      "rounded-md px-md py-md",
      isBull ? "bg-signal-up-soft" : "bg-signal-down-soft",
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
