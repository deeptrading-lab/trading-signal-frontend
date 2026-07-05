/**
 * 전체 사용자 목록(superadmin 유저 관리) — TanStack Query useQuery. (user-login-auth Phase 2)
 *
 * 컨벤션(frontend.md §2) — 도메인 훅(`hooks/admin/useSuperadminUsers`)에서만 호출.
 * 등급/상태 변경 직후 최신을 봐야 하므로 staleTime 0.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAllUsers } from "@/lib/api/admin/users";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { Profile } from "@/lib/types/auth/profile";

export function useQueryAllUsers(): UseQueryResult<Profile[], ApiError> {
  return useQuery<Profile[], ApiError>({
    queryKey: queryKeys.admin.allUsers,
    queryFn: ({ signal }) => fetchAllUsers(signal),
    staleTime: 0,
    retry: 0,
  });
}
