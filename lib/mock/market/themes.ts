/**
 * `/market` 인기 테마 / 섹터 mock — 4건.
 *
 * 시안 `MarketTrends.tsx` 의 첫 컬럼 정합 — AI 솔루션 / 반도체 장비 / 레이어1 코인 / 2차전지.
 * 테마명·대표종목은 데이터 식별자 (한글 표기 유지).
 */

import type { MarketThemes } from "@/lib/types/market/themes";

export const MARKET_THEMES_MOCK: MarketThemes = [
  {
    name: "AI 솔루션",
    changePct: 8.4,
    isUp: true,
    representativeStocks: ["엔비디아", "마이크로소프트", "루닛"],
  },
  {
    name: "반도체 장비",
    changePct: 5.2,
    isUp: true,
    representativeStocks: ["ASML", "한미반도체", "어플라이드"],
  },
  {
    name: "레이어1 코인",
    changePct: 4.1,
    isUp: true,
    representativeStocks: ["솔라나", "아발란체", "수이"],
  },
  {
    name: "2차전지",
    changePct: -2.3,
    isUp: false,
    representativeStocks: ["에코프로", "LG엔솔", "포스코퓨처엠"],
  },
];
