"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { INTRADAY_AUTO_PORTFOLIO_COPY as C } from "@/lib/copy/intraday/autoPortfolio";

type Props = {
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function IntradayCompletePortfolioDialog({ busy, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      event.stopPropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [busy, onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-lg"
      role="alertdialog"
      aria-modal="true"
      aria-label={C.completeConfirmTitle}
    >
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />
      <div className="relative flex w-full max-w-[24rem] flex-col gap-md rounded-2xl bg-surface p-lg shadow-lg">
        <div className="flex flex-col gap-xs">
          <h2 className="text-h2 font-bold text-text-strong">{C.completeConfirmTitle}</h2>
          <p className="text-body-sm leading-relaxed text-text-muted break-keep">
            {C.completeConfirmDescription}
          </p>
        </div>
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-pill bg-surface-muted px-md py-xs text-body-sm-strong text-text-strong transition-colors hover:bg-border-line cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {C.completeCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-pill bg-critical px-md py-xs text-body-sm-strong text-surface transition-opacity hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? C.completing : C.completeConfirmAction}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
