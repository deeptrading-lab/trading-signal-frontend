/**
 * `/profile` 의 설정 메뉴 데이터.
 *
 * 시안 `Profile.tsx` 의 설정 4 항목 + 로그아웃 정합.
 * 카피는 `lib/copy/profile/labels.ts` 의 ID 매핑.
 */

export type ProfileMenuKey =
  | "NOTIFICATIONS"
  | "SECURITY"
  | "BILLING"
  | "THEME"
  | "LOGOUT";

export type ProfileMenuItem = {
  key: ProfileMenuKey;
  /** lucide-react 아이콘 이름 — 컴포넌트 단 매핑. */
  iconName: "Bell" | "Shield" | "CreditCard" | "Moon" | "LogOut";
  /** 위험 톤 (로그아웃) 분기. */
  variant: "default" | "danger";
};

export type ProfileMenuItems = ProfileMenuItem[];
