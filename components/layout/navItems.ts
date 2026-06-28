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
  /**
   * 로컬 CLI(구독) 전용 기능 — Vercel 배포에서는 라우트가 503 이므로 메뉴를 숨긴다.
   * `getVisibleNavItems()` 가 Vercel 환경에서 이 항목을 걸러낸다.
   */
  localOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: NAV_MENU_HOME, icon: House },
  { path: "/watchlist", label: NAV_MENU_WATCHLIST, icon: Star },
  { path: "/stock", label: NAV_MENU_STOCK, icon: BarChart2 },
  { path: "/analyze", label: NAV_MENU_ANALYZE, icon: Compass },
  // 단타 워치 — 로컬 CLI 전용. 마이페이지 바로 위 고정.
  { path: "/intraday", label: NAV_MENU_INTRADAY, icon: Zap, localOnly: true },
  { path: "/profile", label: NAV_MENU_PROFILE, icon: User },
];

/**
 * 현재 실행 환경에서 노출할 메뉴 목록.
 * - 로컬 dev(`next dev`): 전부 노출.
 * - Vercel 배포(production·preview): `localOnly` 항목 제외 — 단타 워치는 로컬 CLI 없이는 동작 불가.
 *
 * `NEXT_PUBLIC_VERCEL_ENV` 는 Vercel 이 클라이언트 번들에 빌드타임 인라인하므로 서버/클라 값이
 * 동일 → 하이드레이션 불일치 없음. (서버 판별은 `lib/server/env.ts isVercelEnv()`.)
 */
export function getVisibleNavItems(): NavItem[] {
  const onVercel = typeof process.env.NEXT_PUBLIC_VERCEL_ENV === "string";
  return onVercel ? NAV_ITEMS.filter((item) => !item.localOnly) : NAV_ITEMS;
}

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
