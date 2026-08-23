/**
 * `/profile` 화면의 한글 라벨 카피.
 *
 * profile-real-data — 자산·보유종목·연동거래소(전부 mock, 원천 없음) 섹션이 제거되면서
 * 관련 카피도 함께 삭제했다. 남은 카피는 실데이터 섹션과 실제 동작하는 설정 항목만 가리킨다.
 */

export const PROFILE_PAGE_TITLE = "마이페이지";

/* 아이덴티티 헤더 — profiles 테이블 실데이터. */
export const PROFILE_NO_NAME = "이름 미상";
/** 가입일 표기 접두 — 예: "2026.05.30 가입". */
export const PROFILE_JOINED_SUFFIX = " 가입";
/** 승인 대기 상태 배지(status=pending). approved 는 배지 없음(정상이 기본). */
export const PROFILE_STATUS_PENDING = "승인 대기";

/* "내 분석" 요약 — 로그인 계정이 분석한 종목(analyze-owner-cards). */
export const MY_ANALYSIS_TITLE = "내 분석";
/**
 * 목록 BFF 가 최근 20건만 내려주므로(CARD_LIST_LIMIT) 총계가 아니라 "최근 N개"로 표기한다.
 * 총 분석 종목 수를 쓰려면 별도 count 조회가 필요 — 요약 지면에 그만한 값어치는 없다.
 */
export const MY_ANALYSIS_COUNT = (n: number) => `최근 ${n}개 종목`;
export const MY_ANALYSIS_EMPTY = "아직 분석한 종목이 없어요.";
export const MY_ANALYSIS_MORE = "전체 보기";
export const MY_ANALYSIS_ERROR = "분석 이력을 불러오지 못했어요.";

/* "내 종목" 요약 — 관심종목·최근 본 종목(둘 다 이 기기에 저장). */
export const MY_STOCKS_TITLE = "내 종목";
export const MY_STOCKS_WATCHLIST = "관심종목";
export const MY_STOCKS_RECENT = "최근 본 종목";
export const MY_STOCKS_EMPTY = "아직 담은 종목이 없어요.";
export const MY_STOCKS_RECENT_EMPTY = "최근 본 종목이 없어요.";
export const MY_STOCKS_MORE = "전체 보기";
/** 두 목록 모두 기기 로컬 저장이라 계정 간 공유되지 않는다는 안내. */
export const MY_STOCKS_LOCAL_HINT = "이 기기에만 저장돼요.";

/* 설정 메뉴 라벨 (`lib/types/profile/menuItems.ts` 의 `ProfileMenuKey` 정합). */
export const SETTINGS_SECTION_TITLE = "설정";
export const MENU_THEME = "화면 테마 설정 (다크모드)";
/* scorecard-nav-link — `/dashboard/scorecard`(판정 적중률 자가점검) 도달성 보조 메뉴 라벨. */
export const MENU_SCORECARD = "신호 성적표 (적중률 자가점검)";
export const MENU_PAPER_TRADING = "AI 모의투자";
/* user-login-auth Phase 2 — admin 이상 "관리자 메뉴" 섹션의 유저 관리 진입점(→/admin). */
export const MENU_ADMIN = "유저 관리";
/* 관리자 메뉴 섹션 제목 — 설정과 별도 섹션(admin 이상만 노출). */
export const ADMIN_MENU_SECTION_TITLE = "관리자 메뉴";
export const MENU_LOGOUT = "로그아웃";

/* 테마 3-state 토글 (light/dark/system) — `components/theme/ThemeMenuButton.tsx`. */
export const THEME_OPTION_LIGHT = "라이트";
export const THEME_OPTION_DARK = "다크";
export const THEME_OPTION_SYSTEM = "시스템";
/** 현재 선택 모드를 메뉴 행 우측에 요약 표시할 때의 a11y 라벨 prefix. */
export const THEME_GROUP_LABEL = "화면 테마";
