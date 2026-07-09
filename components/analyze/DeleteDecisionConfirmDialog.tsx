/**
 * DeleteDecisionConfirmDialog — 저장 분석 결과 "삭제" 전 경고 다이얼로그(superadmin 전용, 파괴적).
 *
 * ReanalyzeConfirmDialog 와 동일 구조(createPortal·Esc capture·클릭 전파 차단)지만, 되돌릴 수 없는
 * 삭제라 확인 버튼을 **critical(위험)** 색으로 둔다.
 */

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DELETE_CONFIRM_TITLE,
  deleteConfirmDesc,
  DELETE_CONFIRM_OK,
  DELETE_CONFIRM_CANCEL,
} from "@/lib/copy/analyze/labels";

interface DeleteDecisionConfirmDialogProps {
  name: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDecisionConfirmDialog({
  name,
  busy,
  onConfirm,
  onCancel,
}: DeleteDecisionConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-lg"
      role="alertdialog"
      aria-modal="true"
      aria-label={DELETE_CONFIRM_TITLE}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative flex w-full max-w-[24rem] flex-col gap-md rounded-2xl bg-surface p-lg shadow-lg">
        <div className="flex flex-col gap-xs">
          <h2 className="text-h2 font-bold text-text-strong">{DELETE_CONFIRM_TITLE}</h2>
          <p className="text-body-sm text-text-muted">{deleteConfirmDesc(name)}</p>
        </div>
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-pill bg-surface-muted px-md py-xs text-body-sm-strong text-text-strong transition-colors hover:bg-border-line cursor-pointer"
          >
            {DELETE_CONFIRM_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-pill bg-critical px-md py-xs text-body-sm-strong text-surface transition-opacity hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {DELETE_CONFIRM_OK}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
