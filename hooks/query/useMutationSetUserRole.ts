/**
 * 사용자 등급 변경 mutation — TanStack Query useMutation. (user-login-auth Phase 2)
 *
 * 성공 시 전체 목록 invalidate. 마지막 superadmin 강등은 라우트가 409 → ApiError.status=409
 * (도메인 훅이 `last_superadmin` 으로 구분). 도메인 훅(`useSuperadminUsers`)만 본 훅을 사용한다.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setUserRole } from "@/lib/api/admin/users";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { ProfileRole } from "@/lib/types/auth/profile";

export function useMutationSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { sub: string; role: ProfileRole }>({
    mutationFn: ({ sub, role }) => setUserRole(sub, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.allUsers });
    },
  });
}
