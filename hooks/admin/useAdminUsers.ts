/**
 * 유저 관리(admin 이상) 도메인 훅 — 전체 목록 + 등급/승인 액션을 화면에 추상화.
 *
 * PRD user-login-auth Phase 2 / frontend.md §2(커스텀훅 의무화):
 *   화면은 본 훅만 import — TanStack 내부 인터페이스 미노출. `mutatingSub`(행 로딩)·`lastError`
 *   (`last_superadmin` = 마지막 최고관리자 강등 차단 409 vs `generic`)로 도메인 의미만 노출.
 *   목록 조회는 admin 이상, 등급 변경은 superadmin 전용(라우트 재방어 · 패널이 canChangeRole 로 게이트).
 */

"use client";

import { useCallback } from "react";
import { useQueryAllUsers } from "@/hooks/query/useQueryAllUsers";
import { useMutationSetUserRole } from "@/hooks/query/useMutationSetUserRole";
import { useMutationSetUserStatus } from "@/hooks/query/useMutationSetUserStatus";
import type {
  Profile,
  ProfileRole,
  ProfileStatus,
} from "@/lib/types/auth/profile";

export type AdminUsersError = null | "generic" | "last_superadmin";

export function useAdminUsers() {
  const query = useQueryAllUsers();
  const roleMutation = useMutationSetUserRole();
  const statusMutation = useMutationSetUserStatus();
  const busy = roleMutation.isPending || statusMutation.isPending;

  const changeRole = useCallback(
    (sub: string, role: ProfileRole) => {
      if (!sub || busy) return;
      roleMutation.mutate({ sub, role });
    },
    [busy, roleMutation],
  );

  const setStatus = useCallback(
    (sub: string, status: ProfileStatus) => {
      if (!sub || busy) return;
      statusMutation.mutate({ sub, status });
    },
    [busy, statusMutation],
  );

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  const lastError: AdminUsersError = roleMutation.isError
    ? roleMutation.error?.status === 409
      ? "last_superadmin"
      : "generic"
    : statusMutation.isError
      ? "generic"
      : null;

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
    /** 등급 변경(superadmin 전용 — 패널이 canChangeRole 로 노출 게이트). */
    changeRole,
    /** 승인/취소(status = approved/pending). */
    setStatus,
    /** 현재 변경 처리 중인 사용자 sub — 없으면 null(행 컨트롤 비활성). */
    mutatingSub,
    /** 직전 변경 실패 종류 — null/generic/last_superadmin. */
    lastError,
  };
}
