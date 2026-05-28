/**
 * `/api/stock/price` 클라이언트 — 브라우저 → BFF route handler 단방향.
 *
 * PRD `stock-api-integration` (PR-B) §3.3.1 — KIS 직접 호출 금지. axios 인스턴스 (`@/lib/api/client`)
 * 의 baseURL = same-origin `/api`. 본 모듈은 hooks/stock/useQueryStockPrice 안에서만 호출한다.
 *
 * BFF 응답은 이미 `StockPrice` 클라이언트 친화 스키마로 매핑된 상태 (PR-A 의 `lib/api/kis/mappers.ts`
 * 가 책임). 따라서 본 클라이언트는 응답 envelope unwrap 외에 추가 가공 없음.
 *
 * 실패 분기:
 *   - 4xx — BFF route 가 ApiError 본문을 통과. axios 인터셉터 (`@/lib/api/client`) 가 한글 메시지 추출.
 *   - 5xx — 동일.
 *   - 타임아웃 — BFF route 가 5s 내 mock fallback. 클라이언트는 정상 응답으로 수신
 *     (`X-Data-Source: mock-timeout` 헤더는 후속 UI 안내용).
 */

import { httpClient } from "@/lib/api/client";
import type { StockPrice } from "@/lib/api/kis/types";

export async function fetchStockPriceClient(ticker: string): Promise<StockPrice> {
  const response = await httpClient.get<StockPrice>("/stock/price", {
    params: { ticker },
  });
  return response.data;
}
