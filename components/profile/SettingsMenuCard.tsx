/**
 * SettingsMenuCard — `/profile` 설정 메뉴 카드 (server component).
 *
 * PR9 (finsight-redesign) 신규.
 *
 * 시안 `Profile.tsx` L59~L78 정합 — 4 설정 (알림 / 보안 / 결제 / 다크모드) + separator + 로그아웃.
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰 (rounded.lg + border + card padding).
 *   - 메뉴 버튼 = `flex items-center gap-md p-md w-full rounded-md text-left hover:bg-surface-muted`.
 *   - 아이콘 = `text-text-muted` (default) / `text-critical` (LOGOUT variant).
 *   - 라벨 = `text-body-strong text-text-strong` (default) / `text-critical` (LOGOUT).
 *   - separator = `h-px bg-border-line` (시안의 `bg-slate-100` cascade).
 *
 * lucide-react 아이콘 매핑은 menuItems mock 의 `iconName` 키에서 도출 — 컴포넌트 단 record.
 */

import { Bell, CreditCard, LogOut, Moon, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  ProfileMenuItem,
  ProfileMenuKey,
} from "@/lib/types/profile/menuItems";
import {
  MENU_NOTIFICATIONS,
  MENU_SECURITY,
  MENU_BILLING,
  MENU_THEME,
  MENU_LOGOUT,
} from "@/lib/copy/profile/labels";

export interface SettingsMenuCardProps {
  items: ProfileMenuItem[];
}

const MENU_LABEL: Record<ProfileMenuKey, string> = {
  NOTIFICATIONS: MENU_NOTIFICATIONS,
  SECURITY: MENU_SECURITY,
  BILLING: MENU_BILLING,
  THEME: MENU_THEME,
  LOGOUT: MENU_LOGOUT,
};

const ICON_MAP = {
  Bell,
  Shield,
  CreditCard,
  Moon,
  LogOut,
} as const;

export function SettingsMenuCard({ items }: SettingsMenuCardProps) {
  const danger = items.find((item) => item.variant === "danger");
  const defaults = items.filter((item) => item.variant !== "danger");

  return (
    <section className="card" aria-label="설정 메뉴">
      <ul className="flex flex-col gap-xs">
        {defaults.map((item) => (
          <li key={item.key}>
            <MenuButton item={item} />
          </li>
        ))}
        {danger ? (
          <>
            <li aria-hidden="true">
              <div className="my-sm h-px bg-border-line" />
            </li>
            <li>
              <MenuButton item={danger} />
            </li>
          </>
        ) : null}
      </ul>
    </section>
  );
}

function MenuButton({ item }: { item: ProfileMenuItem }) {
  const Icon = ICON_MAP[item.iconName];
  const isDanger = item.variant === "danger";
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-md p-md rounded-md text-left transition-colors hover:bg-surface-muted",
        isDanger && "text-critical hover:bg-critical-soft",
      )}
    >
      <Icon
        className={cn("h-5 w-5", isDanger ? "text-critical" : "text-text-muted")}
        aria-hidden="true"
      />
      <span
        className={cn(
          "text-body-strong",
          isDanger ? "text-critical" : "text-text-strong",
        )}
      >
        {MENU_LABEL[item.key]}
      </span>
    </button>
  );
}
