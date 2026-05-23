/**
 * Sidebar — finsight 글로벌 셸 데스크탑(`>= lg`) 좌측 사이드바.
 *
 * PR3 (finsight-redesign) 갱신. PRD §3.3 / §5.3 AC-L-1.
 *
 * 변경 사유 (legacy → v8 finsight shell):
 *   - legacy (PR21~PR25): 워크벤치 한정 history / favorites 섹션 호스트 (SidebarContent 위임).
 *   - v8 (PR3): 글로벌 셸 6 메뉴 항목 — 모든 라우트가 공유. 워크벤치 한정 history / favorites
 *     는 PR5 의 워크벤치 재구성 시점에 별도 우측 패널 또는 페이지 내부로 흡수.
 *
 * 위치: Header 아래 좌측 sticky, 너비 `spacing.sidebar-w` (264px), 세로 `100vh - navbar-h`.
 * 모바일에서는 hidden (CSS 합성 토큰 `sidebar` 안 `hidden lg:flex`).
 *
 * 내부 콘텐츠:
 *   - 상단 FinSight wordmark (Activity 로고 + 텍스트, font-display + text-accent-vivid)
 *   - 6 메뉴 항목 — NAV_ITEMS 단일 정의 (`./navItems.ts`).
 *   - 활성 라우트 강조 — `sidebar-nav-item-active` 합성 토큰.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { NAV_ITEMS, isNavItemActive } from "@/components/layout/navItems";
import { NAV_BRAND_LABEL } from "@/lib/copy/layout/navCopy";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sidebar sticky top-navbar-h min-h-[calc(100vh-theme(spacing.navbar-h))] max-h-[calc(100vh-theme(spacing.navbar-h))]"
      data-component="sidebar"
      aria-label="주 메뉴"
    >
      {/* 상단 브랜드 — Header 의 wordmark 와 시각 중복을 피하기 위해
       *   데스크탑에서는 본 sidebar 가 brand 의 1차 호스트. */}
      <Link href="/" className="sidebar-brand" aria-label={NAV_BRAND_LABEL}>
        <Activity className="sidebar-brand-icon" aria-hidden="true" />
        <span className="sidebar-brand-text">{NAV_BRAND_LABEL}</span>
      </Link>

      <nav className="sidebar-nav" aria-label="메뉴">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item.path, pathname);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "sidebar-nav-item",
                active && "sidebar-nav-item-active",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="sidebar-nav-item-icon" aria-hidden="true" />
              <span className="sidebar-nav-item-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
