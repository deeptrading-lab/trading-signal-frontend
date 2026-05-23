/**
 * `/dashboard` 화면의 한글 라벨 카피.
 *
 * mock 데이터는 `lib/mock/dashboard/*` 에서, 사용자 노출 한글 카피는 본 파일.
 * i18n 도입 시 본 모듈 단위 분리 그대로 동작.
 */

export const DASHBOARD_PAGE_TITLE = "대시보드";

export const PORTFOLIO_TOTAL_VALUE = "총 자산 평가 금액";
export const PORTFOLIO_PRINCIPAL = "총 투자원금";
export const PORTFOLIO_PROFIT = "총 평가손익";
export const PORTFOLIO_STOCK_RATIO = "주식 비중";
export const PORTFOLIO_CRYPTO_RATIO = "코인 비중";

export const HOLDINGS_SECTION_TITLE = "보유 자산 Top 3";
export const HOLDINGS_VIEW_ALL = "전체보기";

export const MARKET_TODAY_TITLE = "오늘장 특징";
export const FEAR_GREED_TITLE = "Fear & Greed Index";

/** Fear & Greed Index enum 한글 매핑 (`lib/types/dashboard/fearGreed.ts` 정합). */
export const FEAR_GREED_EXTREME_FEAR = "Extreme Fear";
export const FEAR_GREED_FEAR = "Fear";
export const FEAR_GREED_NEUTRAL = "Neutral";
export const FEAR_GREED_GREED = "Greed";
export const FEAR_GREED_EXTREME_GREED = "Extreme Greed";

export const MARKET_SNAPSHOT_UP = "상승 종목";
export const MARKET_SNAPSHOT_DOWN = "하락 종목";
