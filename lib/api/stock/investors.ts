/**
 * `/api/stock/investors` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * PRD `investor-flow` §4.B — KIS 직접 호출 금지. axios 인스턴스(`@/lib/api/client`)의 baseURL =
 * same-origin `/api`. 본 모듈은 `hooks/stock/useQueryStockInvestors` 안에서만 호출한다.
 *
 * BFF 응답은 이미 `StockInvestorTrend` 화면 친화 스키마(최근 N일 추이). 본 어댑터는 envelope
 * unwrap 외 추가 가공 없음. 실패 분기(4xx/5xx/타임아웃)는 BFF + axios 인터셉터가 처리.
 */

import { httpClient } from "@/lib/api/client";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";

export type { StockInvestorTrend } from "@/lib/types/stock/investors";

export async function getStockInvestors(
  ticker: string,
): Promise<StockInvestorTrend> {
  const response = await httpClient.get<StockInvestorTrend>("/stock/investors", {
    params: { ticker },
  });
  return response.data;
}
