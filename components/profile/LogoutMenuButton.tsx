/**
 * LogoutMenuButton — `/profile` 설정 메뉴의 로그아웃(danger) 항목 (client component).
 *
 * SettingsMenuCard 는 서버 컴포넌트라 onClick 을 못 단다 → 로그아웃 항목만 client 로 분리.
 * profile-reskin — 마크업·토큰은 설정 목록의 danger 플랫 행(`.profile-menu-row-danger`,
 *   critical 텍스트 + critical-soft hover + disabled opacity)을 공유하고, onClick·isPending 만 얹는다.
 */

"use client";

import { LogOut } from "lucide-react";
import { useLogout } from "@/hooks/auth/useLogout";
import { MENU_LOGOUT } from "@/lib/copy/profile/labels";

export function LogoutMenuButton() {
  const { submit, isPending } = useLogout();

  return (
    <button
      type="button"
      onClick={submit}
      disabled={isPending}
      className="profile-menu-row-danger"
    >
      <LogOut className="h-5 w-5 shrink-0 text-critical" aria-hidden="true" />
      <span className="flex-1 truncate">{MENU_LOGOUT}</span>
    </button>
  );
}
