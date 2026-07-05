/**
 * 역할 위계 유틸 — `user` < `admin` < `superadmin`. (user-login-auth Phase 2 — 3-tier 권한)
 *
 * 서버(라우트 role 게이트)·클라(`useMe`) 공용 순수 함수. Edge·Node 무관.
 * 권한 판정은 항상 위계 비교(`isAtLeast`)로 — 특정 role 문자열 하드코딩 대신 "admin 이상" 식으로.
 */

import type { ProfileRole } from "@/lib/types/auth/profile";

/** 권한 순위 — 높을수록 강함. */
const ROLE_RANK: Record<ProfileRole, number> = {
  user: 0,
  admin: 1,
  superadmin: 2,
};

/** 전체 역할(등급 드롭다운·입력 검증용) — 낮은→높은 순. */
export const ALL_ROLES: readonly ProfileRole[] = ["user", "admin", "superadmin"] as const;

/**
 * `role` 이 `required` 등급 이상인가(위계 비교). null/미상은 false(안전 실패 — 권한 게이트는
 * 확정 등급일 때만 통과).
 */
export function isAtLeast(
  role: ProfileRole | null | undefined,
  required: ProfileRole,
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** 유효한 역할 문자열인지(라우트 입력 검증용). */
export function isValidRole(value: unknown): value is ProfileRole {
  return value === "user" || value === "admin" || value === "superadmin";
}
