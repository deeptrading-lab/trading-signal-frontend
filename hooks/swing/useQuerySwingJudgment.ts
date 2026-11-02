/**
 * 종목 스윙 체크 상세 조회 훅 — TanStack Query useQuery.
 *
 * - queryKey = `queryKeys.swing.judgment(ticker)`.
 * - staleTime / gcTime = `queryConfig.swing.judgment` — 전 거래일 종가 기준이라 장중에도 같다.
 * - 404(지원하지 않는 종목·일봉 없음)는 다시 시도해도 같아서 재시도하지 않는다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSwingJudgment } from "@/lib/api/swing/judgment";
import type { SwingJudgmentResponse } from "@/lib/types/swing/api";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

/** @param enabled false 면 요청하지 않는다(미국 종목 등 — 스윙 체크 미지원). */
export function useQuerySwingJudgment(ticker: string, enabled = true): UseQueryResult<SwingJudgmentResponse, ApiError> {
  return useQuery<SwingJudgmentResponse, ApiError>({
    queryKey: queryKeys.swing.judgment(ticker),
    queryFn: () => fetchSwingJudgment(ticker),
    enabled,
    staleTime: queryConfig.swing.judgment.staleTime,
    gcTime: queryConfig.swing.judgment.gcTime,
    retry: (count, error) => error.status !== 404 && count < 1,
    refetchOnWindowFocus: false,
  });
}
