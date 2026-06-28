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

export const HEADER_PROFILE_ARIA = "프로필 메뉴";

export const HEADER_MARKET_TICKER_ARIA = "글로벌 마켓 시세";

/** 헤더 테마 빠른 토글(light↔dark) — 현재 테마에 따라 전환 대상 안내. */
export const HEADER_THEME_TO_DARK_ARIA = "다크 모드로 전환";
export const HEADER_THEME_TO_LIGHT_ARIA = "라이트 모드로 전환";

export const NOT_FOUND_TITLE = "준비 중인 화면입니다";
export const NOT_FOUND_DESCRIPTION =
  "곧 만나보실 수 있어요. 홈으로 돌아가 다른 메뉴를 둘러보세요.";
export const NOT_FOUND_HOME_CTA = "홈으로 돌아가기";
