/**
 * components/layout/navItems.ts — finsight 글로벌 셸 메뉴 단일 정의.
 *
 * PR3 (finsight-redesign) 신규.
 * home-market-redesign PR2 — 6메뉴 → 3메뉴 + AI분석 "준비 중" 항목 분리.
 * ai-usage-dashboard — /analyze 를 토큰 사용량 대시보드로 활성화. "준비 중"(ComingSoonNavItem) 폐기,
 *   AI분석을 NAV_ITEMS 의 정규 링크 항목으로 승격.
 *
 * `Sidebar` (데스크탑) / `BottomNav` (모바일) 양쪽이 이 파일에서 import → 메뉴 정의 1곳.
 *
 * 활성 판별 — pathname 매칭. `/` 만 정확 일치, 나머지는 prefix 매칭 (서브라우트 진입 시 부모 메뉴 활성).
 */

import {
  House,
  BarChart2,
  Compass,
  Star,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  NAV_MENU_HOME,
  NAV_MENU_ANALYZE,
  NAV_MENU_STOCK,
  NAV_MENU_INTRADAY,
  NAV_MENU_WATCHLIST,
  NAV_MENU_PROFILE,
} from "@/lib/copy/layout/navCopy";

export interface NavItem {
  /** 라우트 path — Next.js App Router 기준. */
  path: string;
  /** 한글 라벨 — 사이드바·바텀nav 텍스트. */
  label: string;
  /** lucide-react 아이콘 컴포넌트. */
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: NAV_MENU_HOME, icon: House },
  { path: "/watchlist", label: NAV_MENU_WATCHLIST, icon: Star },
  { path: "/stock", label: NAV_MENU_STOCK, icon: BarChart2 },
  { path: "/intraday", label: NAV_MENU_INTRADAY, icon: Zap },
  { path: "/analyze", label: NAV_MENU_ANALYZE, icon: Compass },
  { path: "/profile", label: NAV_MENU_PROFILE, icon: User },
];

/**
 * 활성 라우트 판별.
 * - `/` 는 정확 일치만 (홈은 prefix 매칭에서 모든 라우트와 충돌하므로).
 * - 나머지는 `pathname === path` 또는 `pathname.startsWith(path + "/")` (서브라우트 흡수).
 */
export function isNavItemActive(itemPath: string, pathname: string): boolean {
  if (itemPath === "/") {
    return pathname === "/";
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
