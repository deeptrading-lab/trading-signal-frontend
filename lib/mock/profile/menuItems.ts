/**
 * `/profile` 설정 메뉴 mock — 4 + 로그아웃 1.
 *
 * 시안 `Profile.tsx` 의 메뉴 정합 — 알림 / 보안 / 결제 / 다크모드 / (신호 성적표) / 로그아웃.
 * scorecard-nav-link — `/dashboard/scorecard` 도달성 항목(href) 추가. 운영자 자가점검 표라 주 네비 5칸이 아닌 보조 메뉴에 둔다.
 * 라벨 한글은 `lib/copy/profile/labels.ts`, 버튼 카피 (예: "프로필 수정") 는
 * `lib/copy/profile/buttons.ts`.
 */

import type { ProfileMenuItems } from "@/lib/types/profile/menuItems";

export const PROFILE_MENU_ITEMS_MOCK: ProfileMenuItems = [
  { key: "NOTIFICATIONS", iconName: "Bell", variant: "default" },
  { key: "SECURITY", iconName: "Shield", variant: "default" },
  { key: "BILLING", iconName: "CreditCard", variant: "default" },
  { key: "THEME", iconName: "Moon", variant: "default" },
  {
    key: "SCORECARD",
    iconName: "Target",
    variant: "default",
    href: "/dashboard/scorecard",
  },
  {
    key: "PAPER_TRADING",
    iconName: "Bot",
    variant: "default",
    href: "/dashboard/paper-trading",
  },
  { key: "LOGOUT", iconName: "LogOut", variant: "danger" },
];
