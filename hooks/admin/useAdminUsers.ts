/**
 * 유저 관리(admin 이상) 도메인 훅 — 전체 목록 + 등급/승인 액션을 화면에 추상화.
 *
 * PRD user-login-auth Phase 2 / frontend.md §2(커스텀훅 의무화):
 *   화면은 본 훅만 import — TanStack 내부 인터페이스 미노출. 성공/실패는 **토스트**로 피드백
 *   (`useToast`) — 마지막 최고관리자 강등(409)은 전용 메시지. `mutatingSub`(행 로딩)만 상태 노출.
 *   목록 조회는 admin 이상, 등급 변경은 superadmin 전용(라우트 재방어 · 패널이 canChangeRole 로 게이트).
 */

"use client";

import { useCallback } from "react";
import { useQueryAllUsers } from "@/hooks/query/useQueryAllUsers";
import { useMutationSetUserRole } from "@/hooks/query/useMutationSetUserRole";
import { useMutationSetUserStatus } from "@/hooks/query/useMutationSetUserStatus";
import { useToast } from "@/hooks/utils/useToast";
import type {
  Profile,
  ProfileRole,
  ProfileStatus,
} from "@/lib/types/auth/profile";
import {
  ADMIN_ROLE_CHANGED,
  ADMIN_ROLE_CHANGE_ERROR,
  ADMIN_LAST_SUPERADMIN_ERROR,
  ADMIN_STATUS_APPROVED_TOAST,
  ADMIN_STATUS_REVOKED_TOAST,
  ADMIN_STATUS_CHANGE_ERROR,
} from "@/lib/copy/admin/users";

export function useAdminUsers() {
  const query = useQueryAllUsers();
  const roleMutation = useMutationSetUserRole();
  const statusMutation = useMutationSetUserStatus();
  const toast = useToast();
  const busy = roleMutation.isPending || statusMutation.isPending;

  const changeRole = useCallback(
    (sub: string, role: ProfileRole) => {
      if (!sub || busy) return;
      roleMutation.mutate(
        { sub, role },
        {
          onSuccess: () => toast.success(ADMIN_ROLE_CHANGED),
          onError: (err) =>
            toast.error(
              err?.status === 409
                ? ADMIN_LAST_SUPERADMIN_ERROR
                : ADMIN_ROLE_CHANGE_ERROR,
            ),
        },
      );
    },
    [busy, roleMutation, toast],
  );

  const setStatus = useCallback(
    (sub: string, status: ProfileStatus) => {
      if (!sub || busy) return;
      statusMutation.mutate(
        { sub, status },
        {
          onSuccess: () =>
            toast.success(
              status === "approved"
                ? ADMIN_STATUS_APPROVED_TOAST
                : ADMIN_STATUS_REVOKED_TOAST,
            ),
          onError: () => toast.error(ADMIN_STATUS_CHANGE_ERROR),
        },
      );
    },
    [busy, statusMutation, toast],
  );

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  const mutatingSub = roleMutation.isPending
    ? (roleMutation.variables?.sub ?? null)
    : statusMutation.isPending
      ? (statusMutation.variables?.sub ?? null)
      : null;

  return {
    /** 전체 사용자(최신 가입 순). 로딩·에러 시 빈 배열. */
    users: (query.data ?? []) as Profile[],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
    /** 등급 변경(superadmin 전용 — 패널이 canChangeRole 로 노출 게이트). 성공/실패 토스트. */
    changeRole,
    /** 승인/취소(status = approved/pending). 성공/실패 토스트. */
    setStatus,
    /** 현재 변경 처리 중인 사용자 sub — 없으면 null(행 컨트롤 비활성). */
    mutatingSub,
  };
}
