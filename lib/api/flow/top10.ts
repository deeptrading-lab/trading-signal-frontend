/**
 * `/api/flow/top10` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * PRD `investor-flow` §4.A — KIS 직접 호출 금지. axios 인스턴스(`@/lib/api/client`)의 baseURL =
 * same-origin `/api`. 본 모듈은 `hooks/flow/useQueryFlowTop10` 안에서만 호출한다.
 *
 * BFF 응답은 이미 `InvestorFlowTop10` 화면 친화 스키마(외국인·기관 Top10 + asOf). 본 어댑터는
 * envelope unwrap 외 추가 가공 없음. 실패 분기(4xx/5xx/타임아웃)는 BFF + axios 인터셉터가 처리.
 *
 * PRD `market-status-aware-home` §3-0 — 당일 가용성 판정을 위해 `X-Data-Source` 헤더를 표면화한다
 * (당일 502/mock-*=점검, kis/mock=정상). cumulative(`kv`)는 판정 대상이 아니나 동일 envelope 반환.
 */

import { httpClient } from "@/lib/api/client";
import { readDataSource } from "@/lib/utils/dataSource";
import type { DataSource } from "@/lib/types/market/dataSource";
import type { FlowMode, InvestorFlowTop10 } from "@/lib/types/flow/top10";

export type { InvestorFlowTop10 } from "@/lib/types/flow/top10";

/** 어댑터 반환 — 화면 데이터 + 표면화된 출처(당일 가용성 판정 근거). */
export type InvestorFlowTop10Result = {
  data: InvestorFlowTop10;
  dataSource: DataSource | undefined;
};

/** 누적 모드 기본 합산 영업일 수 — BFF 가 clamp(1~7). */
const CUMULATIVE_DAYS = 7;

export async function getInvestorFlowTop10(
  mode: FlowMode = "today",
): Promise<InvestorFlowTop10Result> {
  const params =
    mode === "cumulative"
      ? { mode: "cumulative", days: CUMULATIVE_DAYS }
      : undefined;
  const response = await httpClient.get<InvestorFlowTop10>("/flow/top10", {
    params,
  });
  return { data: response.data, dataSource: readDataSource(response.headers) };
}
