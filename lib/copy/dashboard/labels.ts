/**
 * `/dashboard`(시장심리) 화면의 한글 라벨 카피.
 *
 * home-market-redesign PR1 — 계좌 위젯 카피(총자산/보유종목 등)는 `/profile` 로 이전됨
 * (`lib/copy/profile/labels.ts`). 본 파일에는 **시장심리(MarketSnapshotCard)** 카피만 남는다.
 * MarketSnapshotCard·fearGreed/marketSnapshot mock 은 PR2(홈 시장종합)에서 재활용 예정이라 보존.
 *
 * mock 데이터는 `lib/mock/dashboard/*` 에서, 사용자 노출 한글 카피는 본 파일.
 * i18n 도입 시 본 모듈 단위 분리 그대로 동작.
 */

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
