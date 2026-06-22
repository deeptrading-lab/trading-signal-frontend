/**
 * `/profile` 화면의 한글 라벨 카피.
 *
 * 시안 `Profile.tsx` 정합. enum 의 한글 매핑 (멤버십 / 투자성향 / 거래소 상태 / 메뉴 키) 포함.
 */

export const PROFILE_PAGE_TITLE = "마이페이지";

/* "내 자산" 섹션 (home-market-redesign PR1 — 계좌 위젯 `/dashboard` → `/profile` 이전). */
export const ASSET_SECTION_TITLE = "내 자산";

/* 총자산 히어로 라벨 (`/dashboard` PortfolioHero 카피 이전). */
export const ASSET_TOTAL_VALUE = "총 자산 평가 금액";
export const ASSET_PRINCIPAL = "총 투자원금";
export const ASSET_PROFIT = "총 평가손익";

/* 자산비중 도넛 라벨. */
export const ASSET_DONUT_CENTER = "자산";
export const ASSET_RATIO_STOCK = "주식";
export const ASSET_RATIO_CRYPTO = "코인";

/* 보유종목 전체 테이블 (Top3 요약 아님 — PRD AC-2). */
export const HOLDINGS_TABLE_TITLE = "보유종목";
export const HOLDINGS_COL_NAME = "종목명";
export const HOLDINGS_COL_AMOUNT = "평가액";
export const HOLDINGS_COL_CHANGE = "수익률";
export const HOLDINGS_COL_WEIGHT = "비중";
export const HOLDINGS_SORT_HINT = "정렬";
export const HOLDINGS_EMPTY = "보유 종목이 없어요.";
export const ASSET_EMPTY = "보유 자산이 없어요.";

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
/* scorecard-nav-link — `/dashboard/scorecard`(판정 적중률 자가점검) 도달성 보조 메뉴 라벨. */
export const MENU_SCORECARD = "신호 성적표 (적중률 자가점검)";
export const MENU_LOGOUT = "로그아웃";

/* 테마 3-state 토글 (light/dark/system) — `components/theme/ThemeMenuButton.tsx`. */
export const THEME_OPTION_LIGHT = "라이트";
export const THEME_OPTION_DARK = "다크";
export const THEME_OPTION_SYSTEM = "시스템";
/** 현재 선택 모드를 메뉴 행 우측에 요약 표시할 때의 a11y 라벨 prefix. */
export const THEME_GROUP_LABEL = "화면 테마";
