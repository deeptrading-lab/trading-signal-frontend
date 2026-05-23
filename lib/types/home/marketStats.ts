/**
 * Home 시장 정보 그리드 (시가총액 / 거래대금 / 유통량 / 52주 최고·최저 / 도미넌스).
 *
 * 시안 `StatsGrid.tsx` 정합. 라벨·툴팁은 `lib/copy/home/labels.ts`,
 * 단위·표기 변환은 컴포넌트 단에서.
 */

export type MarketStatKey =
  | "MARKET_CAP"
  | "VOLUME_24H"
  | "CIRCULATING_SUPPLY"
  | "HIGH_52W"
  | "LOW_52W"
  | "DOMINANCE";

export type MarketStat = {
  key: MarketStatKey;
  /** 표시 값 (이미 포맷된 한글 / 숫자 문자열). */
  value: string;
};

export type MarketStats = MarketStat[];
