/**
 * `/dashboard` 보유 자산 Top 3 mock 데이터.
 *
 * 시안 `Dashboard.tsx` 의 Top 3 인라인 정합 — 삼성전자 / 비트코인 / 애플.
 * 한국식 등락 (`isUp` true = 빨강 / false = 파랑) 정합.
 *
 * 사용자 노출 한글 카피 0건 — 자산 이름은 식별자 (ticker 와 동급).
 */

import type { Holding } from "@/lib/types/dashboard/holdings";

export const HOLDINGS_MOCK: Holding[] = [
  {
    name: "삼성전자",
    symbol: "005930",
    assetType: "stock",
    amountKrw: 45_000_000,
    changePct: 2.1,
    isUp: true,
  },
  {
    name: "비트코인",
    symbol: "BTC",
    assetType: "crypto",
    amountKrw: 35_200_000,
    changePct: -1.4,
    isUp: false,
  },
  {
    name: "애플",
    symbol: "AAPL",
    assetType: "stock",
    amountKrw: 24_500_000,
    changePct: 1.8,
    isUp: true,
  },
];
