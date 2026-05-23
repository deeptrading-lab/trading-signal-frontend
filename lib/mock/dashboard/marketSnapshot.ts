/**
 * `/dashboard` 오늘장 상승/하락 종목 수 mock 데이터.
 *
 * 시안 `Dashboard.tsx` 의 `상승 종목 1,245` / `하락 종목 890` 정합.
 */

import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";

export const MARKET_SNAPSHOT_MOCK: MarketSnapshot = {
  up: 1_245,
  down: 890,
};
