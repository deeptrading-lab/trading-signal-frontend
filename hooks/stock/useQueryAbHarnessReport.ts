/**
 * A/B 토큰 최적화 리포트 조회 훅.
 *
 * session 단위로 config별 토큰·비용·소요·품질 drift를 읽는다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAbHarnessReport } from "@/lib/api/stock/abHarness";
import type { AbComparison } from "@/lib/types/stock/abHarness";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryAbHarnessReport(
  session: string,
): UseQueryResult<AbComparison, ApiError> {
  return useQuery<AbComparison, ApiError>({
    queryKey: queryKeys.stock.abHarnessReport(session),
    queryFn: () => fetchAbHarnessReport(session),
    staleTime: queryConfig.stock.abHarnessReport.staleTime,
    gcTime: queryConfig.stock.abHarnessReport.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: session.trim().length > 0,
  });
}
