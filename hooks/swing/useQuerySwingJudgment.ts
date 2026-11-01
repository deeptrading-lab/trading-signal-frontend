/**
 * 종목 스윙 체크 상세 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.swing.judgment(ticker)`.
 * - staleTime / gcTime = `queryConfig.swing.judgment` — 전 거래일 종가 기준이라 장중에도 같다.
 * - `enabled=false`(미국 종목 등)면 요청하지 않는다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSwingJudgment } from "@/lib/api/swing/judgment";
import type { SwingJudgmentResponse } from "@/lib/types/swing/api";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQuerySwingJudgment(
  ticker: string,
  enabled = true,
): UseQueryResult<SwingJudgmentResponse, ApiError> {
  return useQuery<SwingJudgmentResponse, ApiError>({
    queryKey: queryKeys.swing.judgment(ticker),
    queryFn: () => fetchSwingJudgment(ticker),
    enabled,
    staleTime: queryConfig.swing.judgment.staleTime,
    gcTime: queryConfig.swing.judgment.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
