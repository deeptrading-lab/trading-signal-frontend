/**
 * 가입 승인 대기 목록 — TanStack Query useQuery. (PRD user-login-auth §3.7)
 *
 * 컨벤션(frontend.md §2) — 본 페칭 훅은 도메인 훅(`hooks/admin/useAdminApprovals`)에서만
 * 호출한다(화면 직접 import 금지). 실패(403/500)는 도메인 훅이 카피로 흡수한다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchPendingApprovals } from "@/lib/api/admin/approvals";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { Profile } from "@/lib/types/auth/profile";

export function useQueryPendingApprovals(): UseQueryResult<Profile[], ApiError> {
  return useQuery<Profile[], ApiError>({
    queryKey: queryKeys.admin.pendingApprovals,
    queryFn: ({ signal }) => fetchPendingApprovals(signal),
    // 승인 화면은 항상 최신 대기 목록을 봐야 한다 — 캐시 신선도 0.
    staleTime: 0,
    retry: 0,
  });
}
