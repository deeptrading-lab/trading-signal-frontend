/**
 * v4 layout-redesign 의 신규 한글 카피.
 *
 * 기존 actionLabels / errorMessages 와 분리해 두는 이유:
 *   - 기존 카피 (lib/copy/workbench/*) 는 PRD §3.5 무회귀 — 본 v4 가 손대지 않는다.
 *   - layout 영역(navbar / sidebar / drawer / ticker-header / 빈 상태)의 신규 카피만 본 파일에 모은다.
 *   - i18n 도입 시 단위 분리 그대로 동작 (lib/copy/ 유지 이유는 frontend.md §6).
 */

export const NAV_BRAND_LABEL = "TradingSignalEngine";

export const NAV_HAMBURGER_ARIA_OPEN = "메뉴 열기";
export const NAV_HAMBURGER_ARIA_CLOSE = "메뉴 닫기";

export const SIDEBAR_SECTION_HISTORY = "분석 히스토리";
export const SIDEBAR_SECTION_FAVORITES = "즐겨찾기";

export const SIDEBAR_EMPTY_HISTORY = "분석을 실행하면 여기에 최근 종목이 쌓여요.";
export const SIDEBAR_EMPTY_FAVORITES = "관심 종목을 별표로 표시하면 여기에 모여요.";
export const SIDEBAR_EMPTY_HINT = "새로고침 시 초기화돼요.";

export const TICKER_HEADER_EMPTY = "분석할 종목을 검색해 주세요.";

export const FAVORITE_TOGGLE_ARIA_ADD = "즐겨찾기 추가";
export const FAVORITE_TOGGLE_ARIA_REMOVE = "즐겨찾기 해제";

export const FOOTER_DISCLAIMER =
  "투자 판단 보조 자료입니다. 자동 주문이나 수익 보장을 의미하지 않습니다.";
