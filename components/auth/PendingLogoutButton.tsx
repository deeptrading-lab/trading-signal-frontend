/**
 * PendingLogoutButton — `/pending` 화면의 로그아웃 액션(client 아일랜드).
 *
 * PRD `user-login-auth` §3.5 / §3.9:
 *   - `/pending` page 는 정적 서버 컴포넌트로 두고, 세션 정리가 필요한 로그아웃만 본 client 조각으로 분리.
 *   - 도메인 훅 `useLogout` 만 사용(POST /api/auth/logout → 쿠키 삭제 → /login 이동). 세션·앱데이터 노출 0.
 */

"use client";

import { Button } from "@/components/ui/Button";
import { useLogout } from "@/hooks/auth/useLogout";
import { PENDING_LOGOUT_CTA } from "@/lib/copy/auth/pending";

export function PendingLogoutButton() {
  const { submit, isPending } = useLogout();
  return (
    <Button
      variant="secondary"
      onClick={submit}
      disabled={isPending}
      aria-disabled={isPending}
      aria-busy={isPending}
    >
      {PENDING_LOGOUT_CTA}
    </Button>
  );
}
