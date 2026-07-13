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
  NAV_MENU_HOME_SHORT,
  NAV_MENU_ANALYZE_SHORT,
  NAV_MENU_STOCK_SHORT,
  NAV_MENU_INTRADAY_SHORT,
  NAV_MENU_WATCHLIST_SHORT,
  NAV_MENU_PROFILE_SHORT,
} from "@/lib/copy/layout/navCopy";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";

export interface NavItem {
  /** 라우트 path — Next.js App Router 기준. */
  path: string;
  /** 한글 라벨 — 사이드바(펼침)·바텀nav 텍스트. */
  label: string;
  /** 짧은 라벨 — 접힌 사이드바(아이콘 레일)에서 아이콘 아래 노출. */
  shortLabel: string;
  /** lucide-react 아이콘 컴포넌트. */
  icon: LucideIcon;
  /**
   * 운영 도구(단타 워치 등) — **로컬(dev)은 전체 노출, Vercel 배포(prod)는 admin 이상만** 노출한다.
   * DB(Supabase) 기반이라 prod 에서도 세션 조회는 동작(신규 세션 시작만 로컬 CLI 필요).
   * `getVisibleNavItems(isAdmin)` 가 이 규칙을 적용한다.
   */
  localOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: NAV_MENU_HOME, shortLabel: NAV_MENU_HOME_SHORT, icon: House },
  { path: "/watchlist", label: NAV_MENU_WATCHLIST, shortLabel: NAV_MENU_WATCHLIST_SHORT, icon: Star },
  { path: "/stock", label: NAV_MENU_STOCK, shortLabel: NAV_MENU_STOCK_SHORT, icon: BarChart2 },
  // AI 분석 — 일반 유저 전체 공개(analyze-open-access). 판정 카드가 사용자 대면 가치라 개방하되,
  // 운영정보는 지면 안에서 격리: 토큰 사용량 탭은 prod 숨김(AnalyzeTabsContainer IS_PROD)·
  // 카드 삭제는 superadmin(AIDecisionCardMenu)·usage API 는 admin 가드 유지.
  { path: "/analyze", label: NAV_MENU_ANALYZE, shortLabel: NAV_MENU_ANALYZE_SHORT, icon: Compass },
  // 단타 워치 — 로컬은 전체, prod 는 admin 이상만(localOnly). 마이페이지 바로 위 고정.
  { path: "/intraday", label: NAV_MENU_INTRADAY, shortLabel: NAV_MENU_INTRADAY_SHORT, icon: Zap, localOnly: true },
  { path: "/profile", label: NAV_MENU_PROFILE, shortLabel: NAV_MENU_PROFILE_SHORT, icon: User },
];

/**
 * 현재 실행 환경·권한에서 노출할 메뉴 목록.
 * - 로컬 dev(`next dev`): 전부 노출(`isAdmin` 무관).
 * - Vercel 배포(production·preview): `localOnly` 항목은 **admin 이상만** 노출(그 외 유저에게 숨김).
 *
 * `isAdmin` 은 호출 측이 `useMe()` 로 넘긴다(클라 전용, `/api/auth/me` 기반). 미인증·로딩 시 false →
 * prod 에서 첫 렌더는 숨김, 신원 확인 후 admin 이면 노출(짧은 지연, 라우트 자체는 서버 가드가 재방어).
 * `NEXT_PUBLIC_VERCEL_ENV` 는 빌드타임 인라인이라 서버/클라 동일 → 하이드레이션 불일치 없음.
 */
export function getVisibleNavItems(isAdmin: boolean): NavItem[] {
  if (!isVercelRuntime()) return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => !item.localOnly || isAdmin);
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
