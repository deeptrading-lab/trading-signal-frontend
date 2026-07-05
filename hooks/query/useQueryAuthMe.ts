/**
 * 현재 세션 신원(role/isAdmin) 조회 훅 — TanStack Query useQuery.
 *
 * PRD `market-status-aware-home` §3-5. `/api/auth/me`(읽기전용) 소비. queryKey/TTL 은 단일 진실 원천
 * (`queryKeys.auth.me` / `queryConfig.auth.me`). role 변동이 드물어 staleTime 길게 — 표시용 전용
 * (특권 동작 없음). 도메인 훅 `useIsAdmin` 이 이 훅만 소비하고 컴포넌트는 `useIsAdmin` 만 import 한다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getAuthMe } from "@/lib/api/auth/me";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { AuthMeResponse } from "@/lib/types/auth/me";

export function useQueryAuthMe(): UseQueryResult<AuthMeResponse, ApiError> {
  return useQuery<AuthMeResponse, ApiError>({
    queryKey: queryKeys.auth.me,
    queryFn: getAuthMe,
    staleTime: queryConfig.auth.me.staleTime,
    gcTime: queryConfig.auth.me.gcTime,
    // 미인증도 200(role:null)이라 에러 재시도 불필요.
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
