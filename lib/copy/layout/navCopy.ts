/**
 * lib/copy/layout/navCopy.ts — finsight 글로벌 셸의 한글 카피.
 *
 * PR3 (finsight-redesign) 신규 — 6 메뉴 라벨 + 브랜드 + bottom-nav / header / not-found 카피.
 *
 * 격리 사유 (`docs/rules/frontend.md` §6):
 *   - workbench/layoutCopy 는 워크벤치 (PR5 이후 `/analyze`) 한정 카피.
 *   - layout/navCopy 는 모든 라우트가 공유하는 글로벌 셸 카피 — i18n 도입 시 단위 분리 그대로 동작.
 */

export const NAV_BRAND_LABEL = "FinSight";

export const NAV_MENU_DASHBOARD = "대시보드";
export const NAV_MENU_HOME = "홈";
export const NAV_MENU_ANALYZE = "AI 분석";
export const NAV_MENU_MARKET = "시장 동향";
export const NAV_MENU_STOCK = "종목 분석";
export const NAV_MENU_INTRADAY = "단타 워치";
export const NAV_MENU_WATCHLIST = "관심 종목";
export const NAV_MENU_PROFILE = "마이페이지";

/**
 * 접힌 사이드바(아이콘 레일) 전용 짧은 라벨.
 * 데스크탑 사이드바가 접힌 상태에서 아이콘 아래에 한두 글자로 노출한다(토스 좌측 레일 정합).
 * 펼친 상태·모바일 BottomNav 는 위의 전체 라벨(`NAV_MENU_*`) 을 그대로 쓴다.
 */
export const NAV_MENU_HOME_SHORT = "홈";
export const NAV_MENU_ANALYZE_SHORT = "AI";
export const NAV_MENU_STOCK_SHORT = "종목";
export const NAV_MENU_INTRADAY_SHORT = "단타";
export const NAV_MENU_WATCHLIST_SHORT = "관심";
export const NAV_MENU_PROFILE_SHORT = "마이";

/** 사이드바 접기/펼치기 토글 버튼의 aria-label(상태별). */
export const NAV_SIDEBAR_COLLAPSE_ARIA = "메뉴 접기";
export const NAV_SIDEBAR_EXPAND_ARIA = "메뉴 펼치기";

export const HEADER_PROFILE_ARIA = "프로필 메뉴";

export const HEADER_MARKET_TICKER_ARIA = "글로벌 마켓 시세";

/** 헤더 테마 빠른 토글(light↔dark) — 현재 테마에 따라 전환 대상 안내. */
export const HEADER_THEME_TO_DARK_ARIA = "다크 모드로 전환";
export const HEADER_THEME_TO_LIGHT_ARIA = "라이트 모드로 전환";

export const NOT_FOUND_TITLE = "페이지를 찾을 수 없어요";
export const NOT_FOUND_DESCRIPTION =
  "주소가 바뀌었거나 삭제된 페이지일 수 있어요. 홈에서 다시 시작해 보세요.";
export const NOT_FOUND_HOME_CTA = "홈으로";
