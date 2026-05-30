/**
 * Sidebar — finsight 글로벌 셸 데스크탑(`>= lg`) 좌측 사이드바.
 *
 * PR3 (finsight-redesign) 갱신. PRD §3.3 / §5.3 AC-L-1.
 * home-market-redesign PR2 — 메뉴 3개(홈/관심종목/마이페이지) + AI분석 하단 "준비 중".
 *
 * 구조:
 *   - 상단: FinSight 브랜드 wordmark
 *   - 중단: NAV_ITEMS 3개 링크 (/, /watchlist, /profile)
 *   - 하단(mt-auto): AI 분석 "준비 중" 비활성 버튼 (`sidebar-nav-item-coming-soon` + `badge-coming-soon`)
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { NAV_ITEMS, NAV_ITEM_ANALYZE, isNavItemActive } from "@/components/layout/navItems";
import { NAV_BRAND_LABEL, NAV_MENU_COMING_SOON_BADGE } from "@/lib/copy/layout/navCopy";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const ComingSoonIcon = NAV_ITEM_ANALYZE.icon;

  return (
    <aside
      className="sidebar"
      data-component="sidebar"
      aria-label="주 메뉴"
    >
      {/* 상단 브랜드 — Header 의 wordmark 와 시각 중복을 피하기 위해
       *   데스크탑에서는 본 sidebar 가 brand 의 1차 호스트. */}
      <Link href="/" className="sidebar-brand" aria-label={NAV_BRAND_LABEL}>
        <span className="sidebar-brand-badge" aria-hidden="true">
          <Activity className="sidebar-brand-icon" />
        </span>
        <span className="sidebar-brand-text">{NAV_BRAND_LABEL}</span>
      </Link>

      <nav className="sidebar-nav flex-1" aria-label="메뉴">
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

      {/* AI 분석 "준비 중" — 하단 고정, 클릭 불가 */}
      <div className="mt-auto pt-lg">
        <div
          className="sidebar-nav-item-coming-soon"
          aria-disabled="true"
          role="menuitem"
          aria-label={`${NAV_ITEM_ANALYZE.label} (${NAV_MENU_COMING_SOON_BADGE})`}
        >
          <ComingSoonIcon className="sidebar-nav-item-icon" aria-hidden="true" />
          <span className="sidebar-nav-item-label">{NAV_ITEM_ANALYZE.label}</span>
          <span className="ml-auto badge-coming-soon">{NAV_MENU_COMING_SOON_BADGE}</span>
        </div>
      </div>
    </aside>
  );
}
