/**
 * `/market` 주요 지수 mock — 6건.
 *
 * 시안 `MarketTrends.tsx` 의 두 번째 컬럼 정합 —
 * KOSPI / KOSDAQ / S&P 500 / NASDAQ / USDKRW / BTC Dominance.
 */

import type { MarketIndices } from "@/lib/types/market/indices";

export const MARKET_INDICES_MOCK: MarketIndices = [
  { name: "KOSPI", value: "2,750.23", changeDisplay: "+1.20%", isUp: true },
  { name: "KOSDAQ", value: "862.14", changeDisplay: "+0.45%", isUp: true },
  { name: "S&P 500", value: "5,234.18", changeDisplay: "-0.12%", isUp: false },
  { name: "NASDAQ", value: "16,400.12", changeDisplay: "+0.80%", isUp: true },
  { name: "USDKRW", value: "1,342.50", changeDisplay: "-2.10", isUp: false },
  { name: "BTC Dominance", value: "52.4%", changeDisplay: "+0.1%", isUp: true },
];
