/**
 * `/api/stock/description` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * 외부 출처(wisereport) 직접 호출 금지 — BFF 경유(`@/lib/api/client`, baseURL `/api`).
 * 본 모듈은 `hooks/stock/useQueryStockDescription` 안에서만 호출한다.
 *
 * BFF 응답은 이미 `CompanyDescription` 화면 친화 스키마. envelope unwrap 외 가공 없음.
 */

import { httpClient } from "@/lib/api/client";
import type { CompanyDescription } from "@/lib/types/stock/description";

export type { CompanyDescription } from "@/lib/types/stock/description";

export async function getStockDescription(
  ticker: string,
): Promise<CompanyDescription> {
  const response = await httpClient.get<CompanyDescription>(
    "/stock/description",
    { params: { ticker } },
  );
  return response.data;
}
