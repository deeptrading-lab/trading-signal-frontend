/**
 * 스윙 체크 전진 관찰(사후 성적) 조회 훅 — 관리자 화면 전용.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSwingForward } from "@/lib/api/swing/forward";
import type { SwingForwardResponse } from "@/lib/types/swing/api";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQuerySwingForward(): UseQueryResult<SwingForwardResponse, ApiError> {
  return useQuery<SwingForwardResponse, ApiError>({
    queryKey: queryKeys.swing.forward,
    queryFn: fetchSwingForward,
    staleTime: queryConfig.swing.forward.staleTime,
    gcTime: queryConfig.swing.forward.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
