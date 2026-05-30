/**
 * `/profile` "내 자산" 총자산 히어로 mock 데이터.
 *
 * home-market-redesign PR1 — `/dashboard` 의 포트폴리오 mock 을 마이페이지로 이전(PRD §3.1).
 * 실계좌 연동 전까지 mock 유지(조회·분석 전용 스코프).
 *
 * 사용자 노출 한글 카피 0건 — 카피는 `lib/copy/profile/labels.ts`.
 */

import type { Portfolio } from "@/lib/types/profile/portfolio";

export const PORTFOLIO_MOCK: Portfolio = {
  totalKrw: 142_500_000,
  principalKrw: 135_000_000,
  profitKrw: 7_500_000,
  profitPct: 4.2,
  stockPct: 65,
  cryptoPct: 35,
};
