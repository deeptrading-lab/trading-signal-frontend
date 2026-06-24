/**
 * `/profile` 의 설정 메뉴 데이터.
 *
 * 시안 `Profile.tsx` 의 설정 4 항목 + 로그아웃 정합.
 * scorecard-nav-link — `/dashboard/scorecard`(신호 성적표) 도달성 항목 추가(`href` 보유 시 Link 렌더).
 * 카피는 `lib/copy/profile/labels.ts` 의 ID 매핑.
 */

export type ProfileMenuKey =
  | "NOTIFICATIONS"
  | "SECURITY"
  | "BILLING"
  | "THEME"
  | "SCORECARD"
  | "PAPER_TRADING"
  | "LOGOUT";

export type ProfileMenuItem = {
  key: ProfileMenuKey;
  /** lucide-react 아이콘 이름 — 컴포넌트 단 매핑. */
  iconName: "Bell" | "Shield" | "CreditCard" | "Moon" | "Target" | "Bot" | "LogOut";
  /** 위험 톤 (로그아웃) 분기. */
  variant: "default" | "danger";
  /** 설정 화면이 아니라 다른 라우트로 이동하는 항목이면 경로(예: `/dashboard/scorecard`). */
  href?: string;
};

export type ProfileMenuItems = ProfileMenuItem[];
