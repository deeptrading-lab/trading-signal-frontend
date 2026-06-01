/**
 * `/api/flow/top10` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * PRD `investor-flow` §4.A — KIS 직접 호출 금지. axios 인스턴스(`@/lib/api/client`)의 baseURL =
 * same-origin `/api`. 본 모듈은 `hooks/flow/useQueryFlowTop10` 안에서만 호출한다.
 *
 * BFF 응답은 이미 `InvestorFlowTop10` 화면 친화 스키마(외국인·기관 Top10 + asOf). 본 어댑터는
 * envelope unwrap 외 추가 가공 없음. 실패 분기(4xx/5xx/타임아웃)는 BFF + axios 인터셉터가 처리.
 */

import { httpClient } from "@/lib/api/client";
import type { InvestorFlowTop10 } from "@/lib/types/flow/top10";

export type { InvestorFlowTop10 } from "@/lib/types/flow/top10";

export async function getInvestorFlowTop10(): Promise<InvestorFlowTop10> {
  const response = await httpClient.get<InvestorFlowTop10>("/flow/top10");
  return response.data;
}
