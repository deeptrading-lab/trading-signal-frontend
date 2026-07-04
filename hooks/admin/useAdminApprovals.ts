/**
 * 가입 승인(admin) 도메인 훅 — 대기 목록 + 승인 액션을 화면에 추상화.
 *
 * PRD `user-login-auth` §3.7 / frontend.md §2(커스텀훅 의무화):
 *   - 화면 컴포넌트는 본 훅만 import — TanStack 의 `mutate`/`isPending`/`variables`/`reset` 같은
 *     내부 인터페이스를 노출하지 않고 도메인 의미의 `approve`/`approvingSub`/`isApproveError` 로 감싼다.
 *   - `approvingSub` = 현재 승인 처리 중인 사용자 sub(행 버튼 로딩·비활성 판정). 없으면 null.
 */

"use client";

import { useCallback } from "react";
import { useQueryPendingApprovals } from "@/hooks/query/useQueryPendingApprovals";
import { useMutationApproveProfile } from "@/hooks/query/useMutationApproveProfile";
import type { Profile } from "@/lib/types/auth/profile";

export interface AdminApprovals {
  /** 승인 대기 프로필(오래된 순). 로딩·에러 시 빈 배열. */
  profiles: Profile[];
  /** 최초 로딩 중. */
  isLoading: boolean;
  /** 목록 조회 실패(403/500/네트워크). */
  isError: boolean;
  /** 목록 재조회. */
  refetch: () => void;
  /** 해당 사용자 승인(성공 시 목록에서 자동 제거). */
  approve: (sub: string) => void;
  /** 현재 승인 처리 중인 사용자 sub — 없으면 null(행 버튼 로딩·비활성). */
  approvingSub: string | null;
  /** 직전 승인 시도 실패. */
  isApproveError: boolean;
}

export function useAdminApprovals(): AdminApprovals {
  const query = useQueryPendingApprovals();
  const mutation = useMutationApproveProfile();

  const approve = useCallback(
    (sub: string) => {
      if (!sub || mutation.isPending) return;
      mutation.mutate(sub);
    },
    [mutation],
  );

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    profiles: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
    approve,
    approvingSub: mutation.isPending ? (mutation.variables ?? null) : null,
    isApproveError: mutation.isError,
  };
}
