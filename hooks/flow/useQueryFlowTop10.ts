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
import { getInvestorFlowTop10 } from "@/lib/api/flow/top10";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { InvestorFlowTop10 } from "@/lib/types/flow/top10";

export type UseQueryFlowTop10Options = {
  /** false 면 쿼리 비활성. 기본 true. */
  enabled?: boolean;
};

export function useQueryFlowTop10(
  options?: UseQueryFlowTop10Options,
): UseQueryResult<InvestorFlowTop10, ApiError> {
  return useQuery<InvestorFlowTop10, ApiError>({
    queryKey: queryKeys.flow.top10(),
    queryFn: () => getInvestorFlowTop10(),
    enabled: options?.enabled ?? true,
    staleTime: queryConfig.flow.top10.staleTime,
    gcTime: queryConfig.flow.top10.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
