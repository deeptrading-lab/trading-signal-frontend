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

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import { useMe } from "@/hooks/auth/useMe";
import { useMutationDeleteAIDecision } from "@/hooks/query/useMutationDeleteAIDecision";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";
import { ReanalyzeConfirmDialog } from "./ReanalyzeConfirmDialog";
import { DeleteDecisionConfirmDialog } from "./DeleteDecisionConfirmDialog";
import {
  CARD_MENU_LABEL,
  DELETE_LABEL,
  DELETE_RUNNING,
  REANALYZE_LABEL,
  REANALYZE_RUNNING,
} from "@/lib/copy/analyze/labels";

interface AIDecisionCardMenuProps {
  item: AIDecisionListItem;
  /** 표시용 종목명(없으면 ticker). */
  name: string;
}

export function AIDecisionCardMenu({ item, name }: AIDecisionCardMenuProps) {
  const { openFor, isTickerRunning } = useAIAnalysisContext();
  const { isSuperadmin } = useMe();
  const deleteMutation = useMutationDeleteAIDecision();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    right: number;
    anchorTop: number;
  } | null>(null);
  const [menuTop, setMenuTop] = useState(0);

  const runningThis = isTickerRunning(item.ticker);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right, anchorTop: r.top });
    }
    setMenuOpen(true);
  };

  // 아래로 넘치고 위 공간이 충분하면 앵커 위로 플립(공통 드롭다운 플립). 내용(confirming) 변화 시 재측정.
  useLayoutEffect(() => {
    if (!menuOpen || !pos) return;
    const h = menuPanelRef.current?.offsetHeight ?? 0;
    const overflowsBelow = pos.top + h > window.innerHeight - 8;
    const flippedTop = pos.anchorTop - h - 4;
    setMenuTop(overflowsBelow && flippedTop > 8 ? flippedTop : pos.top);
  }, [menuOpen, pos, confirming]);

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
    //   name 을 함께 넘겨 동시분석 탭 라벨로 캐시한다.
    openFor(item.ticker, name);
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
        // ★ a11y — 행(ListRow)이 클릭 가능한 div 이므로 케밥 키보드 조작(Enter/Space)이 행의
        //   onKeyDown(상세 열기)으로 버블링되지 않게 차단(home-reskin 동일 패턴). onClick 은 toggleMenu 가 차단.
        onKeyDown={(e) => e.stopPropagation()}
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
              ref={menuPanelRef}
              role="menu"
              aria-label={CARD_MENU_LABEL}
              className="dropdown-panel fixed z-[70] min-w-[9rem]"
              style={{ top: menuTop, right: pos.right }}
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
              {/* 삭제 — superadmin 전용(레거시 정리). 파괴적이라 critical 색 + 확인 다이얼로그. */}
              {isSuperadmin && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleting(true);
                  }}
                  className={cn(
                    "flex w-full items-center gap-xs px-md py-sm rounded-sm text-left text-body-sm-strong text-critical transition-colors cursor-pointer",
                    "hover:bg-critical-soft disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  {deleteMutation.isPending ? DELETE_RUNNING : DELETE_LABEL}
                </button>
              )}
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

      {deleting && (
        <DeleteDecisionConfirmDialog
          name={name}
          busy={deleteMutation.isPending}
          onConfirm={() => {
            deleteMutation.mutate(item.ticker, { onSettled: () => setDeleting(false) });
          }}
          onCancel={() => setDeleting(false)}
        />
      )}
    </>
  );
}
