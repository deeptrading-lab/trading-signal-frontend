/**
 * 로그아웃 도메인 훅 — 클릭 → 세션 쿠키 삭제 → `/login` 이동.
 *
 * PRD `app-password-gate` §3.3:
 *   - 화면 컴포넌트는 본 훅만 import(fetching 인터페이스 누출 0 — `logout()` 어댑터 경유 = BFF).
 *   - 쿠키 삭제 성공/실패와 무관하게 `/login` 으로 **full navigation**(`window.location.assign`):
 *     서버(proxy 게이트)가 새 쿠키 상태를 즉시 보게 한다(useLogin 의 성공 이동과 정합).
 *   - 로그인과 달리 에러 UI 가 필요 없어(실패해도 로그인 화면으로 보냄) mutation 레이어는 생략.
 */

"use client";

import { useCallback, useState } from "react";
import { logout } from "@/lib/api/auth/logout";

export type UseLogoutResult = {
  submit: () => void;
  isPending: boolean;
};

export function useLogout(): UseLogoutResult {
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(() => {
    if (isPending) return;
    setIsPending(true);
    void logout()
      .catch(() => {
        // 삭제 실패해도 로그인 화면으로 보낸다 — 게이트가 쿠키를 재검증한다.
      })
      .finally(() => {
        window.location.assign("/login");
      });
  }, [isPending]);

  return { submit, isPending };
}
