/**
 * `/profile` 설정 메뉴 mock — 4 + 로그아웃 1.
 *
 * 시안 `Profile.tsx` 의 메뉴 정합 — 알림 / 보안 / 결제 / 다크모드 / 로그아웃.
 * 라벨 한글은 `lib/copy/profile/labels.ts`, 버튼 카피 (예: "프로필 수정") 는
 * `lib/copy/profile/buttons.ts`.
 */

import type { ProfileMenuItems } from "@/lib/types/profile/menuItems";

export const PROFILE_MENU_ITEMS_MOCK: ProfileMenuItems = [
  { key: "NOTIFICATIONS", iconName: "Bell", variant: "default" },
  { key: "SECURITY", iconName: "Shield", variant: "default" },
  { key: "BILLING", iconName: "CreditCard", variant: "default" },
  { key: "THEME", iconName: "Moon", variant: "default" },
  { key: "LOGOUT", iconName: "LogOut", variant: "danger" },
];
