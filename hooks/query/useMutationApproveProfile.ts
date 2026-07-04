/**
 * 가입 승인 mutation — TanStack Query useMutation. (PRD user-login-auth §3.7)
 *
 * 승인 성공 시 대기 목록을 invalidate 해 승인된 사용자가 목록에서 즉시 사라지게 한다.
 * 컨벤션(frontend.md §2) — 도메인 훅(`hooks/admin/useAdminApprovals`)만 본 훅을 사용하고,
 * 컴포넌트는 도메인 훅의 추상 인터페이스(approve/approvingSub 등)만 본다.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveProfile } from "@/lib/api/admin/approvals";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";

export function useMutationApproveProfile() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (sub) => approveProfile(sub),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.pendingApprovals,
      });
    },
  });
}
