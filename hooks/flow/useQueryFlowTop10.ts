/**
 * 표면 A — 외국인/기관 순매수 Top10 조회 훅 (TanStack Query useQuery).
 *
 * PRD `investor-flow` §4.A.
 *
 * - queryKey = `queryKeys.flow.top10()`(인자 없음 — 시장 전체 당일 단일 랭킹).
 * - staleTime / gcTime = `queryConfig.flow.top10`(60s / 5min) — 당일 가집계 신선도(§4.A).
 * - retry 0 — BFF(`/api/flow/top10`)가 이미 부분성공 degrade + mock fallback 을 하므로 RQ 이중
 *   재시도 시 KIS 주체 2콜이 증폭된다. BFF degrade 결과를 그대로 수용.
 * - refetchOnWindowFocus false — focus 마다 KIS 호출 폭주 회피. 명시적 invalidate/재진입으로 갱신.
 *
 * 응답 가공 불필요 — BFF 가 이미 `InvestorFlowTop10` 화면 친화 스키마 반환.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getInvestorFlowTop10,
  type InvestorFlowTop10Result,
} from "@/lib/api/flow/top10";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { DataSource } from "@/lib/types/market/dataSource";
import type { FlowMode, InvestorFlowTop10 } from "@/lib/types/flow/top10";

export type UseQueryFlowTop10Options = {
  /** false 면 쿼리 비활성. 기본 true. */
  enabled?: boolean;
};

/**
 * useQuery 결과에서 `data` 를 화면 데이터로 되돌리고 `dataSource`(표면화된 출처)를 함께 노출한다.
 * 당일 가용성 판정 근거(§3-0) — cumulative(`kv`)는 판정 대상이 아니나 동일 형태로 노출.
 */
export type UseQueryFlowTop10Result = Omit<
  UseQueryResult<InvestorFlowTop10Result, ApiError>,
  "data"
> & {
  data: InvestorFlowTop10 | undefined;
  dataSource: DataSource | undefined;
};

/**
 * @param mode "today"(당일 스냅샷, 기본) | "cumulative"(최근 7영업일 누적).
 *   모드별 queryKey·TTL 분리 — 토글 전환 시 각자 캐시.
 */
export function useQueryFlowTop10(
  mode: FlowMode = "today",
  options?: UseQueryFlowTop10Options,
): UseQueryFlowTop10Result {
  const config =
    mode === "cumulative" ? queryConfig.flow.cumulative : queryConfig.flow.top10;
  const query = useQuery<InvestorFlowTop10Result, ApiError>({
    queryKey: queryKeys.flow.top10(mode),
    queryFn: () => getInvestorFlowTop10(mode),
    enabled: options?.enabled ?? true,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
  return {
    ...query,
    data: query.data?.data,
    dataSource: query.data?.dataSource,
  } as UseQueryFlowTop10Result;
}
