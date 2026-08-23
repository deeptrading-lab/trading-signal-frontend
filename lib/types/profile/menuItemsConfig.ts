/**
 * `/profile` 설정 메뉴 구성 — mock 이 아니라 **고정 구성**이라 lib/mock 에서 이관했다.
 *
 * profile-real-data — 동작하지 않던 항목(알림·보안·결제)을 제거했다. 화면에 있는데 눌러도
 * 아무 일이 없는 행은 mock 데이터와 같은 종류의 거짓말이라, 실제 기능이 생길 때 다시 넣는다.
 * 남은 항목은 전부 실제로 동작한다 — 테마 토글(client), 성적표·유저관리 이동(href), 로그아웃.
 *
 * 카피는 `lib/copy/profile/labels.ts` 의 키 매핑.
 */

import type { ProfileMenuItem, ProfileMenuItems } from "@/lib/types/profile/menuItems";

/** 설정(모든 유저) — 테마 + 로그아웃. */
export const PROFILE_MENU_ITEMS: ProfileMenuItems = [
  { key: "THEME", iconName: "Moon", variant: "default" },
  { key: "LOGOUT", iconName: "LogOut", variant: "danger" },
];

/** 관리자 메뉴(admin 이상) — 신호 성적표. 운영 도구라 일반 유저 미노출. */
export const PROFILE_SCORECARD_MENU_ITEM: ProfileMenuItem = {
  key: "SCORECARD",
  iconName: "Target",
  variant: "default",
  href: "/dashboard/scorecard",
};

/**
 * 관리자 전용 진입점 — 프로필 페이지(서버)가 세션 role==admin 일 때만 주입한다.
 * (user-login-auth §3.7 — nav/설정은 client 라 role 노출 불가 → 서버 조건부 주입으로 플래시 0.
 *  role 위조는 readSession 의 HMAC 서명 검증이 차단, /admin 페이지도 자체 role 게이트로 이중 방어.)
 */
export const PROFILE_ADMIN_MENU_ITEM: ProfileMenuItem = {
  key: "ADMIN",
  iconName: "UserCheck",
  variant: "default",
  href: "/admin",
};
