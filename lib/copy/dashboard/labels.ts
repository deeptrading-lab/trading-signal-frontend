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

/* 두 출처(국내/미국) 게이지 — PRD fear-greed-overhaul */
export const FEAR_GREED_DOMESTIC_TITLE = "국내 (코스피)";
export const FEAR_GREED_US_TITLE = "미국 (CNN)";
/** 국내는 자체 합성이라 산출 방식을 밝혀 오해 방지(베타). */
export const FEAR_GREED_DOMESTIC_SOURCE = "코스피 상승종목·모멘텀 합성 (베타)";
export const FEAR_GREED_US_SOURCE = "출처: CNN";
export const FEAR_GREED_UNAVAILABLE = "지금은 불러올 수 없어요";

/** 구간별 한 줄 해석 — "지금 시장이 좋은지/나쁜지" 직관 전달(FearGreedLabel 정합). */
export const FEAR_GREED_INTERP_EXTREME_FEAR =
  "투자심리가 매우 위축됐어요 — 과매도 구간";
export const FEAR_GREED_INTERP_FEAR = "투자심리가 위축된 편이에요";
export const FEAR_GREED_INTERP_NEUTRAL = "중립 — 뚜렷한 쏠림이 없어요";
export const FEAR_GREED_INTERP_GREED = "투자심리가 과열로 기우는 중이에요";
export const FEAR_GREED_INTERP_EXTREME_GREED =
  "투자심리가 매우 과열됐어요 — 과매수 주의";

export const MARKET_SNAPSHOT_UP = "상승 종목";
export const MARKET_SNAPSHOT_DOWN = "하락 종목";
