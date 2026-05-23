/**
 * `/dashboard` 포트폴리오 hero 카드 mock 데이터.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/Dashboard.tsx` 의 인라인 값 정합 —
 * 총 자산 142,500,000 / 투자원금 135,000,000 / 평가손익 +7,500,000 / +4.2% / 주식 65% / 코인 35%.
 *
 * 사용자 노출 한글 카피 0건 — 카피는 `lib/copy/dashboard/labels.ts`.
 */

import type { Portfolio } from "@/lib/types/dashboard/portfolio";

export const PORTFOLIO_MOCK: Portfolio = {
  totalKrw: 142_500_000,
  principalKrw: 135_000_000,
  profitKrw: 7_500_000,
  profitPct: 4.2,
  stockPct: 65,
  cryptoPct: 35,
};
