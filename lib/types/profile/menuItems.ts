/**
 * `/profile` 의 설정 메뉴 데이터.
 *
 * profile-real-data — 동작하지 않던 알림·보안·결제 키를 제거했다(구성은 menuItemsConfig.ts).
 * scorecard-nav-link — `/dashboard/scorecard`(신호 성적표) 도달성 항목 추가(`href` 보유 시 Link 렌더).
 * 카피는 `lib/copy/profile/labels.ts` 의 ID 매핑.
 */

export type ProfileMenuKey =
  | "THEME"
  | "SCORECARD"
  | "PAPER_TRADING"
  | "ADMIN"
  | "LOGOUT";

export type ProfileMenuItem = {
  key: ProfileMenuKey;
  /** lucide-react 아이콘 이름 — 컴포넌트 단 매핑. */
  iconName: "Moon" | "Target" | "Bot" | "UserCheck" | "LogOut";
  /** 위험 톤 (로그아웃) 분기. */
  variant: "default" | "danger";
  /** 설정 화면이 아니라 다른 라우트로 이동하는 항목이면 경로(예: `/dashboard/scorecard`). */
  href?: string;
};

export type ProfileMenuItems = ProfileMenuItem[];
