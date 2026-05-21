/**
 * MobileDrawer — 모바일(`< lg`) 한정 슬라이드인 사이드 드로어.
 *
 * 동작 명세 (DESIGN.md v4 §Components / Do's and Don'ts):
 *   - 좌측 → 우측 슬라이드인. width spacing.drawer-w (304px). transition 200~240ms.
 *   - 우측 scrim (text-strong @ 10% opacity) tap → 닫힘.
 *   - ESC 키 닫힘 + scrim tap 닫힘 + 상단 close 버튼 닫힘 (세 진입점).
 *   - focus trap 자체 구현 — 첫 focusable / 마지막 focusable 사이 Tab loop.
 *   - body scroll lock — 열림 동안 document.body.style.overflow = "hidden".
 *   - 모바일 → 데스크탑 리사이즈 시 자동 닫기는 호스트 (RootLayout 또는 (workbench)/layout)
 *     가 useBreakpoint().isDesktop 의존성 effect 로 처리.
 *
 * ARIA: role="dialog" + aria-modal="true" + aria-labelledby={drawerTitleId}.
 *
 * 신규 라이브러리 0건 — focus trap·body scroll lock 모두 자체 구현.
 */

"use client";

import { useEffect, useId, useRef } from "react";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { NAV_HAMBURGER_ARIA_CLOSE } from "@/lib/copy/workbench/layoutCopy";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeHistoryEntry } from "@/hooks/workbench/useWorkbenchSession";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedTicker: string | null;
  onSelectHistory: (entry: AnalyzeHistoryEntry) => void;
  onSelectFavorite: (item: WhitelistItem) => void;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileDrawer({
  open,
  onClose,
  selectedTicker,
  onSelectHistory,
  onSelectFavorite,
}: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // ESC 키 닫기 + focus trap.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !drawerRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    // 첫 focus 를 drawer 내부로 옮긴다 (첫 focusable).
    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR,
    );
    focusables?.[0]?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // 닫힘 시 이전 focus 복귀.
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  // body scroll lock.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="drawer-scrim"
        aria-hidden="true"
        role="presentation"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="drawer"
      >
        <header className="flex items-center justify-between mb-lg">
          <h2 id={titleId} className="text-h2">
            메뉴
          </h2>
          <button
            type="button"
            className="navbar-icon-button"
            aria-label={NAV_HAMBURGER_ARIA_CLOSE}
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <SidebarContent
          selectedTicker={selectedTicker}
          onSelectHistory={(entry) => {
            onSelectHistory(entry);
            onClose();
          }}
          onSelectFavorite={(item) => {
            onSelectFavorite(item);
            onClose();
          }}
        />
      </div>
    </>
  );
}
