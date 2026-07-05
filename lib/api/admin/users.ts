/**
 * 전체 사용자 관리 BFF 클라이언트 — 목록/등급/상태. **superadmin 전용 라우트.**
 *
 * 공용 axios(`httpClient`, baseURL `/api`) 경유. superadmin 유저 관리 화면이 도메인 훅
 * (`hooks/admin/useSuperadminUsers`)을 통해 소비. role 방어는 각 route handler 가 수행(403).
 * (user-login-auth Phase 2 — 3-tier 권한)
 */

import { httpClient } from "@/lib/api/client";
import type {
  Profile,
  ProfileRole,
  ProfileStatus,
} from "@/lib/types/auth/profile";

type UsersResponse = { profiles: Profile[] };

/** `GET /api/admin/users` — 전체 사용자(최신 가입 순). 403/500 은 ApiError. */
export async function fetchAllUsers(signal?: AbortSignal): Promise<Profile[]> {
  const res = await httpClient.get<UsersResponse>("/admin/users", { signal });
  return res.data.profiles;
}

/** `POST /api/admin/users/role` — 등급 변경. 마지막 superadmin 강등은 409(ApiError.status). */
export async function setUserRole(sub: string, role: ProfileRole): Promise<void> {
  await httpClient.post("/admin/users/role", { sub, role });
}

/** `POST /api/admin/approvals {sub, status}` — 승인(approved)/취소(pending). */
export async function setUserStatus(sub: string, status: ProfileStatus): Promise<void> {
  await httpClient.post("/admin/approvals", { sub, status });
}
