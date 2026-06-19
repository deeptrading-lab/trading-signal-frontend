/**
 * AI 판정 적중률 집계 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.scorecard.summary`(인자 없는 단일 키).
 * - staleTime / gcTime = `queryConfig.scorecard.summary`(5min / 30min) — cron 하루 1회 채점.
 * - 수동 새로고침 + 짧은 stale(폴링 없음).
 *
 * 컨벤션(frontend.md) — 화면 컴포넌트는 본 도메인 훅만 import(useQuery 직접 import 금지).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchScorecardSummary } from "@/lib/api/scorecard/summary";
import type { ScorecardSummaryResponse } from "@/lib/types/scorecard/scorecard";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryScorecardSummary(): UseQueryResult<
  ScorecardSummaryResponse,
  ApiError
> {
  return useQuery<ScorecardSummaryResponse, ApiError>({
    queryKey: queryKeys.scorecard.summary,
    queryFn: () => fetchScorecardSummary(),
    staleTime: queryConfig.scorecard.summary.staleTime,
    gcTime: queryConfig.scorecard.summary.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
