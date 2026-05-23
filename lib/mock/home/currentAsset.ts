/**
 * `/` (Home / AnalysisDashboard mock) 현재 선택된 자산 mock.
 *
 * 시안 `AnalysisDashboard.tsx` 의 상단 영역 정합 — 비트코인 / BTC/KRW / 89,240,000 KRW / +2.4% / +2,140,000.
 * 한국식 등락 (`isUp` true = 빨강).
 */

import type { CurrentAsset } from "@/lib/types/home/currentAsset";

export const CURRENT_ASSET_MOCK: CurrentAsset = {
  name: "비트코인",
  symbol: "BTC",
  assetType: "crypto",
  pair: "BTC/KRW",
  priceKrw: 89_240_000,
  changeKrw: 2_140_000,
  changePct: 2.4,
  isUp: true,
  unit: "KRW",
};
