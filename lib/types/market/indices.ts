/**
 * `/market` 의 주요 지수 카드 데이터.
 *
 * 시안 `MarketTrends.tsx` 의 두 번째 컬럼 정합 —
 * KOSPI / KOSDAQ / S&P 500 / NASDAQ / USDKRW / BTC Dominance 6건.
 */

export type MarketIndex = {
  /** 지수 이름 (예: "KOSPI", "S&P 500"). */
  name: string;
  /** 표시 값 (예: "2,750.23", "52.4%"). */
  value: string;
  /** 등락 표시 (예: "+1.20%", "-2.10"). */
  changeDisplay: string;
  /** 상승 여부 (한국식 색 정합). */
  isUp: boolean;
};

export type MarketIndices = MarketIndex[];
