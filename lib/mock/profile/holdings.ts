/**
 * `/profile` "내 자산" 보유종목 전체 테이블 mock 데이터.
 *
 * home-market-redesign PR1 — `/dashboard` 의 보유종목 mock 을 마이페이지로 이전(PRD §3.1).
 * 보유종목은 전체 테이블 구조(Top3 요약 아님 — AC-2). mock 은 3종이지만 구조는 전체 테이블.
 * 한국식 등락(`isUp` true = 빨강 / false = 파랑) 정합.
 *
 * 사용자 노출 한글 카피 0건 — 자산 이름은 식별자(ticker 와 동급).
 */

import type { Holding } from "@/lib/types/profile/holdings";

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
