/**
 * `/watchlist` 의 관심종목 리스트 데이터.
 *
 * 시안 `Watchlist.tsx` 의 6 항목 정합 (주식 + 코인 혼합).
 */

export type WatchlistAssetType = "stock" | "crypto";

export type WatchlistItem = {
  /** 종목 이름 (한글 표기). */
  name: string;
  /** ticker / 종목 코드. */
  symbol: string;
  /** 현재가 표시 (예: "84,500", "$894.52", "₩ 89,240,000"). */
  priceDisplay: string;
  /** 등락 표시 (예: "+2.14%"). */
  changeDisplay: string;
  /** 상승 여부 (한국식 색 정합). */
  isUp: boolean;
  /** 자산 종류 — 배지 분기 (주식 = blue, 코인 = orange). */
  assetType: WatchlistAssetType;
};

export type WatchlistItems = WatchlistItem[];
