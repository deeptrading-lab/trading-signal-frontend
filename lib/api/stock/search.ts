/**
 * `/api/stock/search` 클라이언트 — symbols.json 기반 종목 검색 BFF 호출.
 *
 * PRD `stock-api-integration` (PR-B) §3.3.1, §9 q7 [RESOLVED] — 수동 시드 350개 기반 substring.
 * 후속 PR 에서 KIS 검색 API 또는 Fuse.js 도입해도 본 시그니처 유지.
 */

import { httpClient } from "@/lib/api/client";
import type { StockSearchResult } from "@/lib/api/kis/types";

export async function fetchStockSearchClient(
  keyword: string,
): Promise<StockSearchResult[]> {
  const response = await httpClient.get<StockSearchResult[]>("/stock/search", {
    params: { keyword },
  });
  return response.data;
}
