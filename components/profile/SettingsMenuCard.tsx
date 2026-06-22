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

import Link from "next/link";
import { Bell, CreditCard, LogOut, Moon, Shield, Target } from "lucide-react";
import { LogoutMenuButton } from "@/components/profile/LogoutMenuButton";
import { ThemeMenuButton } from "@/components/theme/ThemeMenuButton";
import type {
  ProfileMenuItem,
  ProfileMenuKey,
} from "@/lib/types/profile/menuItems";
import {
  MENU_NOTIFICATIONS,
  MENU_SECURITY,
  MENU_BILLING,
  MENU_THEME,
  MENU_SCORECARD,
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
  SCORECARD: MENU_SCORECARD,
  LOGOUT: MENU_LOGOUT,
};

const ICON_MAP = {
  Bell,
  Shield,
  CreditCard,
  Moon,
  Target,
  LogOut,
} as const;

// default 메뉴 행 공통 클래스 — 버튼(설정)과 링크(이동) 항목이 같은 시각을 공유.
const MENU_ROW_CLASS =
  "w-full flex items-center gap-md p-md rounded-md text-left transition-colors hover:bg-surface-muted";

export function SettingsMenuCard({ items }: SettingsMenuCardProps) {
  const danger = items.find((item) => item.variant === "danger");
  const defaults = items.filter((item) => item.variant !== "danger");

  return (
    <section className="card" aria-label="설정 메뉴">
      <ul className="flex flex-col gap-xs">
        {defaults.map((item) => (
          <li key={item.key}>
            {/* THEME 항목만 client 로 분리(3-state 토글 동작) — 나머지는 server MenuButton 유지. */}
            {item.key === "THEME" ? (
              <ThemeMenuButton />
            ) : item.href ? (
              <MenuLink item={item} />
            ) : (
              <MenuButton item={item} />
            )}
          </li>
        ))}
        {danger ? (
          <>
            <li aria-hidden="true">
              <div className="my-sm h-px bg-border-line" />
            </li>
            <li>
              {/* danger = 로그아웃 — 동작이 필요해 client 컴포넌트로 분리(onClick → 쿠키삭제 → /login). */}
              <LogoutMenuButton />
            </li>
          </>
        ) : null}
      </ul>
    </section>
  );
}

// default(비위험) 설정 항목 전용 — danger(로그아웃)는 LogoutMenuButton 이 담당.
function MenuButton({ item }: { item: ProfileMenuItem }) {
  const Icon = ICON_MAP[item.iconName];
  return (
    <button type="button" className={MENU_ROW_CLASS}>
      <Icon className="h-5 w-5 text-text-muted" aria-hidden="true" />
      <span className="text-body-strong text-text-strong">
        {MENU_LABEL[item.key]}
      </span>
    </button>
  );
}

// 다른 라우트로 이동하는 항목(href 보유) — 예: 신호 성적표 → /dashboard/scorecard.
function MenuLink({ item }: { item: ProfileMenuItem }) {
  const Icon = ICON_MAP[item.iconName];
  return (
    <Link href={item.href ?? "#"} className={MENU_ROW_CLASS}>
      <Icon className="h-5 w-5 text-text-muted" aria-hidden="true" />
      <span className="text-body-strong text-text-strong">
        {MENU_LABEL[item.key]}
      </span>
    </Link>
  );
}
