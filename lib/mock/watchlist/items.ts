/**
 * `/watchlist` 관심종목 mock — 6건 (주식 3 + 코인 3).
 *
 * 시안 `Watchlist.tsx` 의 인라인 리스트 정합 —
 * 삼성전자 / 엔비디아 / 비트코인 / 이더리움 / 솔라나 / 테슬라.
 * 가격 표기 (`priceDisplay`) 의 통화 단위 (원화 / 달러) 와 `₩ / $` 기호는 데이터 단위로 보존.
 */

import type { WatchlistItems } from "@/lib/types/watchlist/items";

export const WATCHLIST_ITEMS_MOCK: WatchlistItems = [
  {
    name: "삼성전자",
    symbol: "005930",
    priceDisplay: "84,500",
    changeDisplay: "+2.14%",
    isUp: true,
    assetType: "stock",
  },
  {
    name: "엔비디아",
    symbol: "NVDA",
    priceDisplay: "$894.52",
    changeDisplay: "+1.20%",
    isUp: true,
    assetType: "stock",
  },
  {
    name: "비트코인",
    symbol: "BTC",
    priceDisplay: "₩ 89,240,000",
    changeDisplay: "-0.50%",
    isUp: false,
    assetType: "crypto",
  },
  {
    name: "이더리움",
    symbol: "ETH",
    priceDisplay: "₩ 4,820,000",
    changeDisplay: "+3.45%",
    isUp: true,
    assetType: "crypto",
  },
  {
    name: "솔라나",
    symbol: "SOL",
    priceDisplay: "₩ 245,000",
    changeDisplay: "-1.20%",
    isUp: false,
    assetType: "crypto",
  },
  {
    name: "테슬라",
    symbol: "TSLA",
    priceDisplay: "$172.82",
    changeDisplay: "-2.40%",
    isUp: false,
    assetType: "stock",
  },
];
