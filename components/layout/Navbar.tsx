/**
 * Navbar — 상단 글로벌 영역.
 *
 * 자리: viewport 최상단 sticky, 가로 100%, 세로 spacing.navbar-h (60px).
 * 데스크탑·모바일 공통 노출. 모바일 한정 좌측 hamburger 가 drawer 토글.
 *
 * 내부 배치 (DESIGN.md v4):
 *   좌측: [모바일 hamburger?] + wordmark.
 *   우측: placeholder (40×40px) — 후속 PRD 의 다크모드 토글·사용자 메뉴 자리.
 *
 * ARIA: hamburger 의 aria-label / aria-expanded / aria-controls.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import {
  NAV_BRAND_LABEL,
  NAV_HAMBURGER_ARIA_OPEN,
} from "@/lib/copy/workbench/layoutCopy";

type Props = {
  /** 모바일에서 hamburger 노출. 데스크탑(`lg+`)에서는 자동 hidden. */
  showHamburger: boolean;
  /** drawer 현재 상태 — aria-expanded 반영. */
  isDrawerOpen: boolean;
  /** hamburger 클릭. drawer 호스트(=route group layout) 가 상태 토글. */
  onHamburgerClick: () => void;
  /** hamburger 가 제어하는 drawer 의 element id. */
  drawerId: string;
};

export function Navbar({
  showHamburger,
  isDrawerOpen,
  onHamburgerClick,
  drawerId,
}: Props) {
  return (
    <header className="navbar sticky top-0 z-[50]">
      <div className="flex items-center gap-sm">
        {showHamburger ? (
          <button
            type="button"
            className={cn("navbar-icon-button lg:hidden")}
            aria-label={NAV_HAMBURGER_ARIA_OPEN}
            aria-expanded={isDrawerOpen}
            aria-controls={drawerId}
            onClick={onHamburgerClick}
          >
            <span aria-hidden="true">☰</span>
          </button>
        ) : null}
        <span className="navbar-brand">{NAV_BRAND_LABEL}</span>
      </div>
      {/* 우측 placeholder — 후속 PRD 의 사용자 메뉴·다크모드 토글 자리. */}
      <div
        aria-hidden="true"
        className="h-[40px] w-[40px]"
      />
    </header>
  );
}
