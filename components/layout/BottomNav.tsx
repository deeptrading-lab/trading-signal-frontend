/**
 * BottomNav — finsight 글로벌 셸 모바일(`< md`) 한정 하단 nav.
 *
 * PR3 (finsight-redesign) 신규. PRD §3.3 / §5.3 AC-L-3.
 * home-market-redesign PR2 — 메뉴 3개(홈/관심종목/마이페이지) + AI분석 "준비 중".
 *
 * 분기: `useBreakpoint().isMobile` 로 모바일에서만 렌더. `window.innerWidth` 직접 검사 금지
 *       (`docs/rules/frontend.md` 반응형 룰). 데스크탑 / 태블릿(`>= md`) 에서는 null 반환.
 *
 * 위치: viewport 하단 sticky (실제로는 `fixed bottom-0`), height `spacing.navbar-h` (60px).
 * 스타일: `bottom-nav` 합성 토큰 — backdrop-blur + bg-surface/80 + border-t border-border-line.
 *
 * 콘텐츠: NAV_ITEMS 3개 + AI분석 "준비 중" (bottom-nav-item-coming-soon) 가로 균등 배치.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { NAV_ITEMS, NAV_ITEM_ANALYZE, isNavItemActive } from "@/components/layout/navItems";
import { NAV_MENU_ANALYZE } from "@/lib/copy/layout/navCopy";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const { isMobile } = useBreakpoint();
  const pathname = usePathname();

  if (!isMobile) return null;

  const ComingSoonIcon = NAV_ITEM_ANALYZE.icon;

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-[50]"
      aria-label="하단 메뉴"
    >
      {NAV_ITEMS.map((item) => {
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
          >
            <Icon className="bottom-nav-item-icon" aria-hidden="true" />
            <span className="bottom-nav-item-label">{item.label}</span>
          </Link>
        );
      })}

      {/* AI 분석 "준비 중" — 클릭 불가 비활성 항목 */}
      <div
        className="bottom-nav-item-coming-soon"
        aria-disabled="true"
        role="menuitem"
        aria-label={`${NAV_MENU_ANALYZE} (준비 중)`}
      >
        <ComingSoonIcon className="bottom-nav-item-icon" aria-hidden="true" />
        <span className="bottom-nav-item-label">{NAV_MENU_ANALYZE}</span>
      </div>
    </nav>
  );
}
