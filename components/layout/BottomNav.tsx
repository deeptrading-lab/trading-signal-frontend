/**
 * BottomNav — finsight 글로벌 셸 모바일(`< md`) 한정 하단 nav.
 *
 * PR3 (finsight-redesign) 신규. PRD §3.3 / §5.3 AC-L-3.
 *
 * 분기: `useBreakpoint().isMobile` 로 모바일에서만 렌더. `window.innerWidth` 직접 검사 금지
 *       (`docs/rules/frontend.md` 반응형 룰). 데스크탑 / 태블릿(`>= md`) 에서는 null 반환.
 *
 * 위치: viewport 하단 sticky (실제로는 `fixed bottom-0`), height `spacing.navbar-h` (60px).
 * 스타일: `bottom-nav` 합성 토큰 — backdrop-blur + bg-surface/80 + border-t border-border-line.
 *         DESIGN.md v8 components 절의 `bottom-nav` / `bottom-nav-item-active` 정합 + glass 효과.
 *
 * 콘텐츠: 6 메뉴 단일 정의 (`./navItems.ts`) 가로 균등 배치. 아이콘 + 라벨 (`caption` typography).
 * 활성 강조 — `bottom-nav-item-active` (text-accent-vivid).
 *
 * SSR 정합 — `useBreakpoint` 가 SSR 에서 `isMobile: true` 로 응답하므로 첫 페인트 시
 *           bottom-nav 노출 (hydration 후 데스크탑이면 자동 unmount). 모바일 퍼스트 정합.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { NAV_ITEMS, isNavItemActive } from "@/components/layout/navItems";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const { isMobile } = useBreakpoint();
  const pathname = usePathname();

  if (!isMobile) return null;

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
    </nav>
  );
}
