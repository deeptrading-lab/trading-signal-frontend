/**
 * components/layout/navItems.ts — finsight 글로벌 셸 6 메뉴 단일 정의.
 *
 * PR3 (finsight-redesign) 신규.
 * `Sidebar` (데스크탑) / `BottomNav` (모바일) 양쪽이 이 파일에서 import → 메뉴 정의 1곳.
 *
 * 라우트 정합 (PRD §3.3 PR3 + §5.3 AC-L-1):
 *   - `/dashboard` — 대시보드 (PR9 에서 채움)
 *   - `/` — 홈 (현 PR3 시점 = 워크벤치 화면, PR5 에서 `/analyze` 로 이전, PR6 의 AnalysisDashboard 로 교체)
 *   - `/analyze` — AI 분석 워크벤치 (PR5 에서 채움)
 *   - `/market` — 시장 동향 (PR8 에서 채움)
 *   - `/watchlist` — 관심 종목 (PR9 에서 채움)
 *   - `/profile` — 마이페이지 (PR9 에서 채움)
 *
 * 활성 판별 — pathname 매칭. `/` 만 정확 일치, 나머지는 prefix 매칭 (서브라우트 진입 시 부모 메뉴 활성).
 */

import {
  LayoutDashboard,
  Activity,
  Compass,
  TrendingUp,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";

import {
  NAV_MENU_DASHBOARD,
  NAV_MENU_HOME,
  NAV_MENU_ANALYZE,
  NAV_MENU_MARKET,
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
  { path: "/dashboard", label: NAV_MENU_DASHBOARD, icon: LayoutDashboard },
  { path: "/", label: NAV_MENU_HOME, icon: Activity },
  { path: "/analyze", label: NAV_MENU_ANALYZE, icon: Compass },
  { path: "/market", label: NAV_MENU_MARKET, icon: TrendingUp },
  { path: "/watchlist", label: NAV_MENU_WATCHLIST, icon: Star },
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
