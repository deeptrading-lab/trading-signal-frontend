/**
 * Sidebar — finsight 글로벌 셸 데스크탑(`>= lg`) 좌측 사이드바.
 *
 * PR3 (finsight-redesign) 갱신. PRD §3.3 / §5.3 AC-L-1.
 * home-market-redesign PR2 — 메뉴 4개 + AI분석.
 * ai-usage-dashboard — AI분석(/analyze)을 정규 링크로 승격, "준비 중" 하단 항목 폐기.
 * sidebar-collapsible — 접기/펼치기(토스식 `<<`/`>>`) + 컴팩트화.
 *
 * 구조:
 *   - 상단: FinSight 브랜드(펼침=아이콘+워드마크 / 접힘=아이콘만) → `/` 링크
 *   - 그 아래: 접기/펼치기 토글 버튼(`<<`/`>>`)
 *   - 중단: NAV_ITEMS 링크 (/, /watchlist, /stock, /analyze, [/intraday], /profile)
 *
 * 접힘 상태(아이콘 레일, ~76px): 아이콘 위 + 짧은 라벨(shortLabel) 아래로 세로 배치, 활성 항목은
 *   아이콘 뒤 채운 하이라이트(accent-vivid-soft). 상태는 `useSidebarCollapsed`(localStorage 지속,
 *   SSR-safe = 첫 렌더 펼침 → 마운트 후 저장값 swap)에서 관리. 폭 전환은 `.sidebar` 의
 *   `transition-[width]`(모션 토큰 + prefers-reduced-motion 존중) 로 부드럽게 애니메이션한다.
 *   본 사이드바는 `hidden lg:flex` (데스크탑 전용) — 모바일은 BottomNav 가 담당(무관).
 *
 * "종목 분석" 클릭은 BottomNav 와 공유하는 `useStockNavClick` 훅으로 일원화(중복 제거 + 폴백 교정).
 *   접힘·펼침 무관하게 동일 바인딩을 Link 에 spread 한다(의도 prefetch 유지).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { BrandPulseIcon } from "@/components/layout/BrandPulseIcon";
import { getVisibleNavItems, isNavItemActive } from "@/components/layout/navItems";
import {
  NAV_BRAND_LABEL,
  NAV_SIDEBAR_COLLAPSE_ARIA,
  NAV_SIDEBAR_EXPAND_ARIA,
} from "@/lib/copy/layout/navCopy";
import { useStockNavClick } from "@/hooks/layout/useStockNavClick";
import { useSidebarCollapsed } from "@/hooks/layout/useSidebarCollapsed";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const stockNavBinding = useStockNavClick();
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <aside
      className="sidebar"
      data-component="sidebar"
      data-collapsed={collapsed ? "true" : undefined}
      aria-label="주 메뉴"
    >
      {/* 상단 브랜드 — Header 의 wordmark 와 시각 중복을 피하기 위해
       *   데스크탑에서는 본 sidebar 가 brand 의 1차 호스트. 접힘 시 워드마크 생략(아이콘만). */}
      <Link href="/" className="sidebar-brand group" aria-label={NAV_BRAND_LABEL}>
        <span className="sidebar-brand-badge" aria-hidden="true">
          <BrandPulseIcon className="sidebar-brand-icon" gradientId="sidebarPulse" />
        </span>
        {!collapsed && <span className="sidebar-brand-text">{NAV_BRAND_LABEL}</span>}
      </Link>

      {/* 접기/펼치기 토글 — 토스식 `<<`(접기) / `>>`(펼치기). */}
      <button
        type="button"
        className="sidebar-collapse-toggle"
        aria-label={collapsed ? NAV_SIDEBAR_EXPAND_ARIA : NAV_SIDEBAR_COLLAPSE_ARIA}
        aria-expanded={!collapsed}
        onClick={toggle}
      >
        {collapsed ? (
          <ChevronsRight className="sidebar-collapse-toggle-icon" aria-hidden="true" />
        ) : (
          <ChevronsLeft className="sidebar-collapse-toggle-icon" aria-hidden="true" />
        )}
      </button>

      <nav className="sidebar-nav flex-1" aria-label="메뉴">
        {getVisibleNavItems().map((item) => {
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
              // 접힘 시 짧은 라벨만 보이므로 전체 라벨을 native tooltip 으로 보강.
              title={collapsed ? item.label : undefined}
              {...(item.path === "/stock" ? stockNavBinding(active) : {})}
            >
              {/* iconbox — 접힘 상태에서 활성 하이라이트(채운 배경)를 아이콘 뒤에만 두는 래퍼. */}
              <span className="sidebar-nav-item-iconbox" aria-hidden="true">
                <Icon className="sidebar-nav-item-icon" />
              </span>
              <span className="sidebar-nav-item-label">
                {collapsed ? item.shortLabel : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
