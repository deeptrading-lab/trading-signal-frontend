/**
 * `/profile` 화면의 한글 라벨 카피.
 *
 * 시안 `Profile.tsx` 정합. enum 의 한글 매핑 (멤버십 / 투자성향 / 거래소 상태 / 메뉴 키) 포함.
 */

export const PROFILE_PAGE_TITLE = "마이페이지";

/* 멤버십 enum 한글 매핑 (`lib/types/profile/user.ts` 의 `MembershipTier` 정합). */
export const MEMBERSHIP_FREE = "FREE 멤버십";
export const MEMBERSHIP_PRO = "PRO 멤버십";
export const MEMBERSHIP_ENTERPRISE = "ENTERPRISE 멤버십";

/* 투자성향 enum 한글 매핑 (`lib/types/profile/user.ts` 의 `InvestorType` 정합). */
export const INVESTOR_TYPE_PREFIX = "투자성향: ";
export const INVESTOR_TYPE_CONSERVATIVE = "안정형";
export const INVESTOR_TYPE_MODERATE = "안정추구형";
export const INVESTOR_TYPE_BALANCED = "위험중립형";
export const INVESTOR_TYPE_GROWTH = "적극투자형";
export const INVESTOR_TYPE_AGGRESSIVE = "공격투자형";

/* 연동 거래소 섹션 */
export const CONNECTED_SECTION_TITLE = "연동된 거래소 / 증권사";
export const EXCHANGE_STATUS_CONNECTED = "연동됨";
export const EXCHANGE_STATUS_DISCONNECTED = "연결 필요";

/* 거래소 동기화 시점 (mock 의 SyncedAtKey 정합) */
export const SYNC_REALTIME = "실시간 동기화";
export const SYNC_1H_AGO = "1시간 전 동기화";
export const SYNC_NONE = "-";

/* 설정 메뉴 라벨 (`lib/types/profile/menuItems.ts` 의 `ProfileMenuKey` 정합). */
export const MENU_NOTIFICATIONS = "알림 설정";
export const MENU_SECURITY = "보안 및 인증";
export const MENU_BILLING = "구독 / 결제 관리";
export const MENU_THEME = "화면 테마 설정 (다크모드)";
export const MENU_LOGOUT = "로그아웃";
