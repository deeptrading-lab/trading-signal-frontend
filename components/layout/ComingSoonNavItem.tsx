/**
 * ComingSoonNavItem — "AI 분석" 준비 중(비활성) 네비 항목 + 안내 말풍선.
 *
 * Sidebar(데스크탑)·BottomNav(모바일)가 공유 → coming-soon 마크업/카피를 한 곳에 통일한다.
 *   (이전: BottomNav 가 "준비 중" 문구·라벨을 하드코딩해 Sidebar 와 불일치했다.)
 *
 * 말풍선: 클릭 불가 항목이 "왜 반응이 없지?" 로 보이지 않도록 안내를 띄운다.
 *   - 호버(데스크탑): 진입 시 표시, 이탈 시 숨김.
 *   - 탭(모바일): 표시 후 AUTO_DISMISS_MS 뒤 자동 사라짐.
 *   - 외부 클릭 시 닫힘.
 *   - 위쪽으로 뜨고 아래 꼬리(▼) — Sidebar(좌하단)·BottomNav(하단) 양쪽 모두 자연스러움.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_ITEM_ANALYZE } from "@/components/layout/navItems";
import {
  NAV_MENU_COMING_SOON_BADGE,
  NAV_MENU_COMING_SOON_TOOLTIP,
} from "@/lib/copy/layout/navCopy";

const AUTO_DISMISS_MS = 2500;

export interface ComingSoonNavItemProps {
  variant: "sidebar" | "bottom";
}

export function ComingSoonNavItem({ variant }: ComingSoonNavItemProps) {
  const Icon = NAV_ITEM_ANALYZE.icon;
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 탭(터치) 시 — 표시 후 잠깐 뒤 자동 사라짐. 호버는 onMouseLeave 가 닫는다.
  function handleClick() {
    setShow(true);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), AUTO_DISMISS_MS);
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const isSidebar = variant === "sidebar";
  const wrapperClass = isSidebar ? "relative" : "relative flex-1 flex";
  const itemClass = isSidebar ? "sidebar-nav-item-coming-soon" : "bottom-nav-item-coming-soon";
  const iconClass = isSidebar ? "sidebar-nav-item-icon" : "bottom-nav-item-icon";
  const labelClass = isSidebar ? "sidebar-nav-item-label" : "bottom-nav-item-label";
  const tooltipPos = isSidebar
    ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
    : "bottom-full mb-2 right-1";

  return (
    <div
      ref={wrapperRef}
      className={wrapperClass}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div
        className={itemClass}
        role="menuitem"
        aria-disabled="true"
        aria-label={`${NAV_ITEM_ANALYZE.label} (${NAV_MENU_COMING_SOON_BADGE})`}
        onClick={handleClick}
      >
        <Icon className={iconClass} aria-hidden="true" />
        <span className={labelClass}>{NAV_ITEM_ANALYZE.label}</span>
        {isSidebar && (
          <span className="ml-auto badge-coming-soon">{NAV_MENU_COMING_SOON_BADGE}</span>
        )}
      </div>

      {show && (
        <div role="tooltip" className={`nav-tooltip ${tooltipPos}`}>
          {NAV_MENU_COMING_SOON_TOOLTIP}
        </div>
      )}
    </div>
  );
}
