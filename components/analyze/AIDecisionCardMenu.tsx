/**
 * AIDecisionCardMenu — 결과 카드 우상단 케밥(⋮) 메뉴.
 *
 * 클릭하면 작은 드롭다운이 열리고 "재분석" 항목을 띄운다. 항목 클릭 → 경고 다이얼로그
 * (ReanalyzeConfirmDialog) → 확인 시 `openFor(ticker)` 로 우측 AI 분석 패널을 연다(종목 상세
 * "AI 종합 분석" 버튼과 동일 진입). 분석이 끝나면 컨텍스트가 목록 캐시를 무효화해 카드가 갱신된다.
 *
 * 카드는 `overflow-hidden` 이라 드롭다운을 카드 안에 절대배치하면 잘린다 → 버튼 좌표를 측정해
 *   `createPortal` 로 body 에 fixed 배치한다. 바깥 클릭/Esc/스크롤로 닫는다. 클릭 전파는 막아
 *   카드 전체클릭(상세 열기)과 충돌하지 않게 한다.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";
import { ReanalyzeConfirmDialog } from "./ReanalyzeConfirmDialog";
import { CARD_MENU_LABEL, REANALYZE_LABEL, REANALYZE_RUNNING } from "@/lib/copy/analyze/labels";

interface AIDecisionCardMenuProps {
  item: AIDecisionListItem;
  /** 표시용 종목명(없으면 ticker). */
  name: string;
}

export function AIDecisionCardMenu({ item, name }: AIDecisionCardMenuProps) {
  const { openFor, isRunning, analyzingTicker } = useAIAnalysisContext();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const runningThis = isRunning && analyzingTicker === item.ticker;

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setMenuOpen(true);
  };

  // Esc / 스크롤로 닫기(바깥 클릭은 아래 투명 백드롭이 처리 — 카드 열림과 충돌 방지).
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    window.addEventListener("scroll", close, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [menuOpen]);

  const handleConfirm = () => {
    setConfirming(false);
    // 종목 상세 "AI 종합 분석" 버튼과 동일 — 패널만 열고 공급자 선택→분석은 패널에 위임.
    openFor(item.ticker);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={CARD_MENU_LABEL}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
        className={cn(
          "relative z-20 inline-flex h-7 w-7 items-center justify-center rounded-full cursor-pointer",
          "text-text-muted transition-colors hover:bg-surface-muted hover:text-text-strong",
          menuOpen && "bg-surface-muted text-text-strong",
        )}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>

      {menuOpen && pos &&
        createPortal(
          <>
            {/* 투명 백드롭 — 바깥 클릭으로 닫되 카드 onClick(상세 열기)으로 전파되지 않게 가로챔 */}
            <div
              className="fixed inset-0 z-[60]"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div
              role="menu"
              aria-label={CARD_MENU_LABEL}
              className="dropdown-panel fixed z-[70] min-w-[9rem]"
              style={{ top: pos.top, right: pos.right }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                disabled={runningThis}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirming(true);
                }}
                className={cn(
                  "flex w-full items-center gap-xs px-md py-sm rounded-sm text-left text-body-sm-strong text-text-strong transition-colors cursor-pointer",
                  "hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <RefreshCw size={14} aria-hidden="true" className={cn(runningThis && "animate-spin")} />
                {runningThis ? REANALYZE_RUNNING : REANALYZE_LABEL}
              </button>
            </div>
          </>,
          document.body,
        )}

      {confirming && (
        <ReanalyzeConfirmDialog
          name={name}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
