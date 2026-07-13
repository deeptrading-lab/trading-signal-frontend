/**
 * `/api/stock/search` 클라이언트 어댑터 — 종목 검색 BFF 호출.
 *
 * mobile-perf-bundle: 검색 시드(국내+미국 2MB JSON)는 서버 전용 — 클라이언트는 이 얇은
 * fetcher 만 소비한다(번들·힙 비용 0). 검색 정책·랭킹은 BFF(`searchSymbols`)가 담당.
 */

import { httpClient } from "@/lib/api/client";
import type { StockSearchResult } from "@/lib/api/kis/types";

export async function fetchStockSearch(
  keyword: string,
): Promise<StockSearchResult[]> {
  const response = await httpClient.get<StockSearchResult[]>("/stock/search", {
    params: { q: keyword },
  });
  return response.data;
}
