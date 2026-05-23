/**
 * `/market` 의 인기 테마 / 섹터 카드 데이터.
 *
 * 시안 `MarketTrends.tsx` 의 첫 컬럼 정합 — 테마명 + 등락률 + 대표 종목 3건.
 */

export type MarketTheme = {
  /** 테마 / 섹터 이름 (예: "AI 솔루션", "반도체 장비"). */
  name: string;
  /** 등락률 (백분율). */
  changePct: number;
  /** 상승 여부 (한국식 색 정합). */
  isUp: boolean;
  /** 대표 종목 이름 3건 (한글 표기). */
  representativeStocks: string[];
};

export type MarketThemes = MarketTheme[];
