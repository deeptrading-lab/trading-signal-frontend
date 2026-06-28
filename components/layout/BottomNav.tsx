/**
 * BottomNav — finsight 글로벌 셸 모바일(`< md`) 한정 하단 nav.
 *
 * PR3 (finsight-redesign) 신규. PRD §3.3 / §5.3 AC-L-3.
 * home-market-redesign PR2 / ai-usage-dashboard — NAV_ITEMS 5개(홈/관심종목/종목분석/AI분석/마이페이지).
 *
 * 분기: `useBreakpoint().isMobile` 로 모바일에서만 렌더. `window.innerWidth` 직접 검사 금지
 *       (`docs/rules/frontend.md` 반응형 룰). 데스크탑 / 태블릿(`>= md`) 에서는 null 반환.
 *
 * 위치: viewport 하단 sticky (실제로는 `fixed bottom-0`), height `spacing.navbar-h` (60px).
 * 스타일: `bottom-nav` 합성 토큰 — backdrop-blur + bg-surface/80 + border-t border-border-line.
 *
 * 콘텐츠: NAV_ITEMS 5개 가로 균등 배치.
 *   "종목 분석" 클릭은 Sidebar 와 공유하는 `useStockNavClick` 훅으로 일원화.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { getVisibleNavItems, isNavItemActive } from "@/components/layout/navItems";
import { useStockNavClick } from "@/hooks/layout/useStockNavClick";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const { isMobile } = useBreakpoint();
  const pathname = usePathname();
  const handleStockNavClick = useStockNavClick();

  if (!isMobile) return null;

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-[50]"
      aria-label="하단 메뉴"
    >
      {getVisibleNavItems().map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(item.path, pathname);
        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "bottom-nav-item",
              active && "bottom-nav-item-active",
            )}
            aria-current={active ? "page" : undefined}
            onClick={item.path === "/stock" ? (e) => handleStockNavClick(e, active) : undefined}
          >
            <Icon className="bottom-nav-item-icon" aria-hidden="true" />
            <span className="bottom-nav-item-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
