/**
 * mock 종목 검색 fixture.
 *
 * PRD `stock-api-integration` §6.4 — 본 fixture 는 환경변수 미설정 시에도 검색이 동작하도록.
 *
 * 실 검색 (`lib/api/kis/search.ts`) 은 symbols.json substring 매칭이라 환경변수 없이도 동작 가능.
 * 본 mock 은 BFF route 가 일관된 `X-Data-Source: mock` 응답을 돌리는 용도.
 */

import type { StockSearchResult } from "@/lib/api/kis/types";

const MOCK_SEARCH_RESULTS: StockSearchResult[] = [
  { ticker: "005930", name: "삼성전자", market: "KOSPI" },
  { ticker: "000660", name: "SK하이닉스", market: "KOSPI" },
  { ticker: "035420", name: "NAVER", market: "KOSPI" },
  { ticker: "035720", name: "카카오", market: "KOSPI" },
  { ticker: "207940", name: "삼성바이오로직스", market: "KOSPI" },
];

export function getMockStockSearch(keyword: string): StockSearchResult[] {
  const trimmed = keyword.trim().toLowerCase();
  if (trimmed === "") return MOCK_SEARCH_RESULTS;
  return MOCK_SEARCH_RESULTS.filter(
    (s) =>
      s.name.toLowerCase().includes(trimmed) ||
      s.ticker.includes(trimmed),
  );
}
