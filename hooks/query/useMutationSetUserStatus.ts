/**
 * 사용자 승인/취소 mutation — TanStack Query useMutation. (user-login-auth Phase 2)
 *
 * 성공 시 전체 목록 invalidate. 도메인 훅(`useSuperadminUsers`)만 본 훅을 사용한다.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setUserStatus } from "@/lib/api/admin/users";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { ProfileStatus } from "@/lib/types/auth/profile";

export function useMutationSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { sub: string; status: ProfileStatus }>({
    mutationFn: ({ sub, status }) => setUserStatus(sub, status),
    // 실패는 useAdminUsers 의 per-call onError 토스트로 처리 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.allUsers });
    },
  });
}
