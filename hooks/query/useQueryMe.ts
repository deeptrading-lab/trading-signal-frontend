/**
 * 현재 세션 신원(role/email) — TanStack Query useQuery. (user-login-auth Phase 2)
 *
 * 컨벤션(frontend.md §2) — 본 페칭 훅은 도메인 훅(`hooks/auth/useMe`)에서만 호출한다.
 * 신원은 세션 수명 내 거의 안 바뀌므로 staleTime 을 넉넉히(5분) 둔다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchMe, type MeResponse } from "@/lib/api/auth/me";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";

export function useQueryMe(): UseQueryResult<MeResponse, ApiError> {
  return useQuery<MeResponse, ApiError>({
    queryKey: queryKeys.auth.me,
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}
