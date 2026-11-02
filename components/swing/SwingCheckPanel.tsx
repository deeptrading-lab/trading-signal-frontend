/**
 * SwingCheckPanel — 종목 헤더 "스윙 체크" 버튼이 여는 사이드 패널.
 *
 * 데스크톱(md+): 오른쪽에서 화면 절반 폭으로 나오는 패널(전체 높이). 모바일: 아래에서 올라오는 시트(88vh).
 * 내용은 종목 카드(`SwingJudgmentCard`) 그대로 — 주의 사유·조건 체크·참고 레벨·과거 통계·AI로 정리하기.
 * 공용 오버레이 패턴: 포털 + 배경 클릭·Escape·뒤로가기(useOverlayBackClose) 닫기 + 배경 스크롤 잠금.
 */

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useOverlayBackClose } from "@/hooks/utils/useOverlayBackClose";
import { SWING_PANEL_ARIA, SWING_PANEL_CLOSE, SWING_PANEL_SUBTITLE } from "@/lib/copy/swing/labels";
import { SwingJudgmentCard } from "./SwingJudgmentCard";

export function SwingCheckPanel({ ticker, name, onClose }: { ticker: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // 모바일 뒤로가기 → 패널만 닫기(라우트 유지). 열릴 때만 마운트되는 컴포넌트라 open=true 고정.
  useOverlayBackClose(true, onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-label={SWING_PANEL_ARIA(name)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg md:h-full md:w-[min(50vw,44rem)] md:rounded-none md:rounded-l-2xl"
      >
        <div className="flex flex-none items-start justify-between gap-md border-b border-border-line px-lg py-md">
          <div className="min-w-0">
            <p className="truncate text-h2 text-text-strong">{name}</p>
            <p className="text-caption text-text-muted">{SWING_PANEL_SUBTITLE}</p>
          </div>
          <button
            type="button"
            aria-label={SWING_PANEL_CLOSE}
            onClick={onClose}
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-strong"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-lg py-lg">
          <SwingJudgmentCard ticker={ticker} />
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
