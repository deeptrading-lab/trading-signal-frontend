/**
 * 가입 승인 BFF 클라이언트 — 대기 목록 조회 / 승인.
 *
 * 브라우저는 Supabase(service-role)를 직접 만지지 않고 route handler(`/api/admin/approvals`)만
 * 호출한다. 공용 axios 인스턴스(`httpClient`, baseURL `/api`) 경유. (PRD user-login-auth §3.7)
 *
 * role 방어는 route handler 가 세션 신원(`readSession`)으로 수행한다 — 비관리자는 403(ApiError).
 */

import { httpClient } from "@/lib/api/client";
import type { Profile } from "@/lib/types/auth/profile";

/** `GET /api/admin/approvals` 응답 — 대기(pending) 프로필 목록. */
type PendingApprovalsResponse = { profiles: Profile[] };

/**
 * 승인 대기 목록 조회(오래된 순). 403(비관리자)·500(스토어 오류)은 axios 인터셉터가
 * `ApiError` 로 reject → 호출 측 도메인 훅이 실패 카피로 처리한다.
 */
export async function fetchPendingApprovals(
  signal?: AbortSignal,
): Promise<Profile[]> {
  const res = await httpClient.get<PendingApprovalsResponse>("/admin/approvals", {
    signal,
  });
  return res.data.profiles;
}

/** 해당 사용자(`sub`)를 `approved` 로 전환. 실패 시 `ApiError` throw. */
export async function approveProfile(sub: string): Promise<void> {
  await httpClient.post("/admin/approvals", { sub });
}
