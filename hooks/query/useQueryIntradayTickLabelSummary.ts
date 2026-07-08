/**
 * 틱 자가채점 라벨 집계 조회 — TanStack Query useQuery. intraday-decision-overhaul PR-2.
 *
 * queryKey = `queryKeys.intraday.tickLabelSummary`(인자 없는 단일 키).
 * staleTime / gcTime = `queryConfig.intraday.tickLabelSummary` — 라벨은 실행/세션 완료 때만
 * 변하므로 폴링 없음(실행 mutation 이 invalidate).
 *
 * 컨벤션(frontend.md) — 본 페칭 훅(`hooks/query/`)은 도메인 훅에서만 호출한다(화면 직접 import 금지).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchIntradayTickLabelSummary } from "@/lib/api/intraday/labels";
import type { IntradayTickLabelSummaryResponse } from "@/lib/types/intraday/tickLabels";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryIntradayTickLabelSummary(
  enabled = true,
): UseQueryResult<IntradayTickLabelSummaryResponse, ApiError> {
  return useQuery<IntradayTickLabelSummaryResponse, ApiError>({
    queryKey: queryKeys.intraday.tickLabelSummary,
    queryFn: () => fetchIntradayTickLabelSummary(),
    enabled,
    staleTime: queryConfig.intraday.tickLabelSummary.staleTime,
    gcTime: queryConfig.intraday.tickLabelSummary.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
