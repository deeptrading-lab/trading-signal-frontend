/**
 * ReanalyzeConfirmDialog — "재분석" 진입 전 경고 다이얼로그.
 *
 * "기존 결과가 사라지고 교체됨"을 알리고, 확인 시 호출자가 `openFor(ticker)` 로 패널을 연다.
 * 카드 케밥 메뉴(AIDecisionCardMenu)·상세 시트 버튼(ReanalyzeButton)이 공용으로 쓴다.
 *
 * `createPortal` 로 body 에 띄운다 — 카드의 `overflow-hidden`·전체클릭(role=button)과 상세 시트의
 *   transform 컨테이닝 블록을 모두 벗어나야 하기 때문. 클릭/Esc 전파를 막아 카드 열림·시트 닫힘과
 *   충돌하지 않게 한다(Esc 는 capture 로 상위 핸들러보다 먼저 가로챈다).
 */

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  REANALYZE_CONFIRM_TITLE,
  reanalyzeConfirmDesc,
  REANALYZE_CONFIRM_HINT,
  REANALYZE_CONFIRM_OK,
  REANALYZE_CONFIRM_CANCEL,
} from "@/lib/copy/analyze/labels";

interface ReanalyzeConfirmDialogProps {
  /** 표시용 종목명 — 경고 문구에 사용. */
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ReanalyzeConfirmDialog({ name, onConfirm, onCancel }: ReanalyzeConfirmDialogProps) {
  // Esc 취소 — capture 단계로 상위(상세 시트)의 Esc-닫기보다 먼저 가로채 전파를 끊는다.
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
      aria-label={REANALYZE_CONFIRM_TITLE}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative flex w-full max-w-[24rem] flex-col gap-md rounded-2xl bg-surface p-lg shadow-lg">
        <div className="flex flex-col gap-xs">
          <h2 className="text-h2 font-bold text-text-strong">{REANALYZE_CONFIRM_TITLE}</h2>
          <p className="text-body-sm text-text-muted">{reanalyzeConfirmDesc(name)}</p>
          <p className="text-caption text-text-muted">{REANALYZE_CONFIRM_HINT}</p>
        </div>
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-pill bg-surface-muted px-md py-xs text-body-sm-strong text-text-strong transition-colors hover:bg-border-line cursor-pointer"
          >
            {REANALYZE_CONFIRM_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-pill bg-accent-vivid px-md py-xs text-body-sm-strong text-surface transition-opacity hover:opacity-90 cursor-pointer"
          >
            {REANALYZE_CONFIRM_OK}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
