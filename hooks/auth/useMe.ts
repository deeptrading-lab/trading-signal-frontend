/**
 * 현재 사용자 신원 요약 — role-aware UI(관리자 전용 표시 등)용 도메인 훅. (user-login-auth Phase 2)
 *
 * `useQueryMe` 를 감싸 화면이 `isAdmin` 만으로 조건부 렌더하게 한다. 로딩·미인증 시 isAdmin=false
 * (안전 실패 — 관리자 전용 UI 는 확정 admin 일 때만 노출).
 */

"use client";

import { useQueryMe } from "@/hooks/query/useQueryMe";

export function useMe() {
  const { data, isLoading } = useQueryMe();
  return {
    isLoading,
    authenticated: data?.authenticated ?? false,
    role: data?.role ?? null,
    email: data?.email ?? null,
    /** 확정 관리자일 때만 true — 관리자 전용 표시 게이트. */
    isAdmin: data?.role === "admin",
  };
}
