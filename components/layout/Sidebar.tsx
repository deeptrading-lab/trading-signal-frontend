/**
 * Sidebar — finsight 글로벌 셸 데스크탑(`>= lg`) 좌측 사이드바.
 *
 * PR3 (finsight-redesign) 갱신. PRD §3.3 / §5.3 AC-L-1.
 * home-market-redesign PR2 — 메뉴 4개 + AI분석.
 * ai-usage-dashboard — AI분석(/analyze)을 정규 링크로 승격, "준비 중" 하단 항목 폐기.
 * sidebar-collapsible — 접기/펼치기(토스식 `<<`/`>>`) + 컴팩트화.
 *
 * 구조:
 *   - 상단 헤더 행: 펼침 = 브랜드(좌, 아이콘+워드마크) + 접기 토글(우) / 접힘 = 아이콘 로고 + 펼치기 토글 세로 중앙
 *   - 중단: NAV_ITEMS 링크 (/, /watchlist, /stock, /analyze, [/intraday], /profile)
 *
 * 접힘 상태(아이콘 레일, ~76px): 아이콘 위 + 짧은 라벨(shortLabel) 아래로 세로 배치, 활성 항목은
 *   아이콘 뒤 채운 하이라이트(accent-vivid-soft). 상태는 `useSidebarCollapsed`(localStorage 지속,
 *   SSR-safe = 첫 렌더 펼침 → 마운트 후 저장값 swap)에서 관리. 폭 전환은 `.sidebar` 의
 *   `transition-[width]`(모션 토큰 + prefers-reduced-motion 존중) 로 부드럽게 애니메이션한다.
 *   본 사이드바는 `hidden lg:flex` (데스크탑 전용) — 모바일은 BottomNav 가 담당(무관).
 *
 * ★ 접힘 스타일은 **컴포넌트 조건부 Tailwind 클래스**로 적용한다(과거 `.sidebar[data-collapsed="true"]`
 *   속성-선택자 + `@apply` + `@layer` 조합은 이 Tailwind v4/Turbopack 파이프라인에서 컴파일 CSS 에
 *   방출되지 않아 접힘 레일이 렌더되지 않던 버그가 있었음). 리터럴 유틸리티는 className 스캐너가
 *   항상 잡으므로 확실히 컴파일된다. `.sidebar` 폭은 `w-sidebar-w`(base) 위에 `collapsed` 시
 *   `w-sidebar-collapsed-w`(utilities 레이어 우선) 로 덮어 76px 로 축소 → transition-[width] 가 애니메이션.
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
import { NavLinkPending } from "@/components/layout/NavLinkPending";
import { useMe } from "@/hooks/auth/useMe";
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
  // prod 에서 운영 도구(단타) 메뉴는 admin 이상만 — 로컬은 전체(getVisibleNavItems 내부 분기).
  const { isAdmin } = useMe();

  return (
    <aside
      // 접힘 시 폭을 76px(w-sidebar-collapsed-w)로 — utilities 레이어가 .sidebar(components)의
      //   w-sidebar-w(208px) 를 이겨 축소. transition-[width](.sidebar) 가 부드럽게 애니메이션.
      className={cn("sidebar", collapsed && "w-sidebar-collapsed-w")}
      data-component="sidebar"
      data-collapsed={collapsed ? "true" : undefined}
      aria-label="주 메뉴"
    >
      {/* 상단 헤더 — 펼침: 브랜드(좌)·접기 토글(우) 한 행 / 접힘: 아이콘 로고·펼치기 토글 세로 중앙 스택.
       *   (브랜드는 Header 워드마크와 중복을 피해 데스크탑에서 sidebar 가 1차 호스트. 접힘 시 워드마크 생략.) */}
      <div
        className={cn(
          "mb-md flex",
          collapsed
            ? "flex-col items-center gap-sm"
            : "items-center justify-between gap-sm",
        )}
      >
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
      </div>

      <nav className="sidebar-nav flex-1" aria-label="메뉴">
        {getVisibleNavItems(isAdmin).map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item.path, pathname);
          return (
            <Link
              key={item.path}
              href={item.path}
              // 접힘: 아이콘 위 / 짧은 라벨 아래 세로 스택(flex-col) + 활성 배경은 iconbox 로 이동(bg-transparent).
              className={cn(
                "sidebar-nav-item",
                active && "sidebar-nav-item-active",
                collapsed && "flex-col justify-center gap-xs h-auto px-0 py-xs",
                collapsed && active && "bg-transparent",
              )}
              aria-current={active ? "page" : undefined}
              // 접힘 시 짧은 라벨만 보이므로 전체 라벨을 native tooltip 으로 보강.
              title={collapsed ? item.label : undefined}
              {...(item.path === "/stock" ? stockNavBinding(active) : {})}
            >
              {/* pending 피드백 래퍼 — 부모(.sidebar-nav-item)의 내부 레이아웃(펼침 row / 접힘 col)을 복제. */}
              <NavLinkPending
                className={cn(
                  "flex items-center gap-md",
                  collapsed && "flex-col justify-center gap-xs",
                )}
              >
                {/* iconbox — 접힘 시 36px 하이라이트 박스(활성=채운 배경). 펼침 시 크기 없는 통과 래퍼. */}
                <span
                  className={cn(
                    "sidebar-nav-item-iconbox",
                    collapsed && "h-9 w-9 rounded-md",
                    collapsed && active && "bg-accent-vivid-soft",
                  )}
                  aria-hidden="true"
                >
                  <Icon className="sidebar-nav-item-icon" />
                </span>
                {/* 접힘: caption(12px) 뮤트 라벨, 활성 시 accent. */}
                <span
                  className={cn(
                    "sidebar-nav-item-label",
                    collapsed && "text-caption text-text-muted",
                    collapsed && active && "text-accent-vivid",
                  )}
                >
                  {collapsed ? item.shortLabel : item.label}
                </span>
              </NavLinkPending>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
