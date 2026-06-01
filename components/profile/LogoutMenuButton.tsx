/**
 * LogoutMenuButton — `/profile` 설정 메뉴의 로그아웃(danger) 항목 (client component).
 *
 * SettingsMenuCard 는 서버 컴포넌트라 onClick 을 못 단다 → 로그아웃 항목만 client 로 분리.
 * 마크업·토큰은 SettingsMenuCard 의 danger MenuButton 과 동일(시각 무변경), onClick 만 추가.
 */

"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLogout } from "@/hooks/auth/useLogout";
import { MENU_LOGOUT } from "@/lib/copy/profile/labels";

export function LogoutMenuButton() {
  const { submit, isPending } = useLogout();

  return (
    <button
      type="button"
      onClick={submit}
      disabled={isPending}
      className={cn(
        "w-full flex items-center gap-md p-md rounded-md text-left transition-colors",
        "text-critical hover:bg-critical-soft",
        isPending && "opacity-[0.65] cursor-not-allowed",
      )}
    >
      <LogOut className="h-5 w-5 text-critical" aria-hidden="true" />
      <span className="text-body-strong text-critical">{MENU_LOGOUT}</span>
    </button>
  );
}
