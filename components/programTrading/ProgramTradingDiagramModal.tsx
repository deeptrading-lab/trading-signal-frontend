"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { PROGRAM_MENU_COPY as M } from "@/lib/copy/programTrading/programTrading";
import { cn } from "@/lib/utils/cn";

export function ProgramTradingDiagramModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [diagram, setDiagram] = useState<"summary" | "buy" | "sell" | "settlement">("summary");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement;
    const scrollArea = document.querySelector("main");
    const previousOverflow = scrollArea?.style.overflow;
    if (scrollArea) scrollArea.style.overflow = "hidden";
    // Native modal supplies focus containment and makes the app behind it inert.
    dialog.showModal();
    const handleViewerMessage = (event: MessageEvent) => {
      if (event.source === dialog.querySelector("iframe")?.contentWindow && event.data?.type === "program-trading:diagram-close") dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    };
    window.addEventListener("message", handleViewerMessage);
    return () => {
      window.removeEventListener("message", handleViewerMessage);
      dialog.close();
      if (scrollArea) scrollArea.style.overflow = previousOverflow ?? "";
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
      className="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-main-max-w flex-col overflow-hidden border border-border-line bg-surface p-0 text-text-strong shadow-overlay backdrop:bg-black/50 open:flex md:h-[calc(100dvh-theme(spacing.2xl))] md:w-11/12 md:rounded-xl"
    >
      <header className="flex shrink-0 items-center justify-between gap-md border-b border-border-line px-lg py-md">
        <h2 id={titleId} className="text-h2 font-bold">{M.diagramTitle}</h2>
        <button type="button" autoFocus onClick={onClose} aria-label={M.closeDiagram} className="button-icon h-hit-area-min w-hit-area-min shrink-0 focus-visible:outline-2 focus-visible:outline-primary"><X className="h-5 w-5" aria-hidden="true" /></button>
      </header>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-sm px-lg py-md">
        <div className="grid w-full grid-cols-2 gap-xs sm:grid-cols-4 sm:w-auto" role="group" aria-label={M.diagramHint}>
          {(["summary", "buy", "sell", "settlement"] as const).map(view => <button key={view} type="button" aria-pressed={diagram === view} onClick={() => setDiagram(view)} className={cn("min-h-hit-area-min rounded-md px-md py-sm text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", diagram === view ? "bg-primary text-surface" : "bg-surface-muted text-text-muted")}>{M.diagramViews[view]}</button>)}
        </div>
        <a href={`/api/program-trading/diagram?view=${diagram}`} target="_blank" rel="noreferrer" className="inline-flex min-h-hit-area-min items-center gap-xs text-body-sm text-link">{M.openDiagram}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a>
        <p className="w-full text-caption text-text-muted md:hidden">{M.diagramMobileHint}</p>
      </div>
      <p className="shrink-0 px-lg pb-md text-body-sm text-text-muted" role="status">{M.diagramDescriptions[diagram]}</p>
      <div className="min-h-0 flex-1 overflow-auto border-t border-border-line focus-visible:outline-2 focus-visible:outline-primary" tabIndex={0} role="region" aria-label={M.diagramHint}>
        <iframe key={diagram} src={`/api/program-trading/diagram?view=${diagram}`} title={M.diagramViews[diagram]} sandbox="allow-scripts allow-downloads" className="block h-full w-full min-w-[theme(screens.md)] border-0 bg-surface md:min-w-0" />
      </div>
    </dialog>
  );
}
