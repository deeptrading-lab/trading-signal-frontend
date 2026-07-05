/**
 * 현재 사용자 신원 요약 — role-aware UI(관리자 전용 표시·유저 관리 등)용 도메인 훅. (user-login-auth Phase 2)
 *
 * `useQueryMe` 를 감싸 화면이 `isAdmin`(admin 이상)·`isSuperadmin` 만으로 조건부 렌더하게 한다.
 * 로딩·미인증 시 전부 false(안전 실패 — 권한 UI 는 확정 등급일 때만 노출).
 */

"use client";

import { useQueryMe } from "@/hooks/query/useQueryMe";
import { isAtLeast } from "@/lib/auth/roles";

export function useMe() {
  const { data, isLoading } = useQueryMe();
  const role = data?.role ?? null;
  return {
    isLoading,
    authenticated: data?.authenticated ?? false,
    role,
    email: data?.email ?? null,
    /** admin 이상(admin·superadmin) — 관리자 전용 표시 게이트. */
    isAdmin: isAtLeast(role, "admin"),
    /** superadmin — 유저·등급 관리 게이트. */
    isSuperadmin: role === "superadmin",
  };
}
