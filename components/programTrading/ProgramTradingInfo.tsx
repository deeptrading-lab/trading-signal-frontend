"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { PROGRAM_MENU_COPY as M } from "@/lib/copy/programTrading/programTrading";

type OpenMode = "hover" | "focus" | "pressed";

export function ProgramTradingInfo({ label, description }: { label: string; description: string }) {
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState<OpenMode | null>(null);

  useEffect(() => {
    if (!open) return;
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(null);
    }
    document.addEventListener("keydown", dismissOnEscape);
    document.addEventListener("pointerdown", dismissOutside);
    return () => {
      document.removeEventListener("keydown", dismissOnEscape);
      document.removeEventListener("pointerdown", dismissOutside);
    };
  }, [open]);

  return (
    <span
      ref={root}
      className="inline-flex shrink-0"
      onPointerEnter={event => {
        if (event.pointerType === "mouse") setOpen(current => current ?? "hover");
      }}
      onPointerLeave={() => setOpen(current => current === "hover" ? null : current)}
    >
      <button
        type="button"
        aria-label={M.infoLabel(label)}
        aria-describedby={id}
        className="inline-flex size-hit-area-min items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        onFocus={event => {
          if (event.currentTarget.matches(":focus-visible")) setOpen("focus");
        }}
        onBlur={() => setOpen(null)}
        onClick={() => setOpen(current => current === "pressed" ? null : "pressed")}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className="absolute top-full left-0 z-20 w-64 max-w-full rounded-md border border-border-line bg-surface p-sm text-body-sm font-normal break-keep text-text-strong shadow-md"
      >
        {description}
      </span>
    </span>
  );
}
