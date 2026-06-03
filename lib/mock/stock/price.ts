/**
 * mock 현재가 fixture.
 *
 * PRD `stock-api-integration` §6.4 — KIS 환경변수 미설정 시 BFF route 가 본 fixture 를 반환.
 *
 * 응답 헤더 `X-Data-Source: mock` 와 함께 클라이언트 친화 스키마 (`StockPrice`) 그대로 반환.
 * mock 안에 사용자 노출 한글 카피는 0건 — 종목명·ticker 같은 식별자만 (frontend.md §3 정합).
 */

import type { StockPrice } from "@/lib/api/kis/types";

export function getMockStockPrice(ticker: string): StockPrice {
  // 시드 종목 일부의 정합 데이터. 시드에 없는 ticker 는 ticker 그대로 + 0 가격.
  const seed = MOCK_PRICES[ticker];
  if (seed) return seed;
  return {
    ticker,
    name: ticker,
    price: 0,
    change: 0,
    changePercent: 0,
    direction: "flat",
    volume: 0,
  };
}

const MOCK_PRICES: Record<string, StockPrice> = {
  "005930": {
    ticker: "005930",
    name: "삼성전자",
    price: 71_500,
    change: 500,
    changePercent: 0.7,
    direction: "up",
    volume: 12_345_678,
    open: 71_000,
    high: 71_900,
    low: 70_800,
    foreignRatio: 53.21,
  },
  "000660": {
    ticker: "000660",
    name: "SK하이닉스",
    price: 175_300,
    change: -2_700,
    changePercent: -1.52,
    direction: "down",
    volume: 4_567_890,
    open: 178_000,
    high: 178_500,
    low: 174_900,
    foreignRatio: 50.87,
  },
  "035420": {
    ticker: "035420",
    name: "NAVER",
    price: 189_500,
    change: 0,
    changePercent: 0,
    direction: "flat",
    volume: 678_901,
  },
};
