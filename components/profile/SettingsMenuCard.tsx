/**
 * SettingsMenuCard — `/profile` 설정 메뉴 (server component).
 *
 * PR9 (finsight-redesign) → **profile-reskin**(카드리스 플랫 섹션).
 *
 * profile-real-data — 동작하지 않던 알림·보안·결제 행을 제거했다. 남은 행은 전부 실제로 동작한다.
 *
 * profile-reskin — 카드 셸(`card`)·항목별 rounded 박스 폐기 → `Section`(플랫 "설정" 제목) +
 *   `ul.divide-y`(행 사이 헤어라인, 양 끝 선 없음) + `.profile-menu-row` 플랫 행. 홈 랭킹 톤 정합.
 *   - 이동/설정 행 = 아이콘 + 라벨 + 우측 `ChevronRight`(도달성 어포던스). full-width hover.
 *   - THEME = client 3-state 세그먼트(ThemeMenuButton). LogoutMenuButton = danger 행(critical).
 *   - 행 스타일 단일 진실 원천 = `.profile-menu-row(-danger)`(app/components.css) — 3 컴포넌트 공유.
 *   - ADMIN(user-login-auth) = role==admin 일 때만 프로필 페이지가 items 에 주입하는 `/admin` 이동 행.
 *
 * lucide-react 아이콘 매핑은 menuItems mock 의 `iconName` 키에서 도출 — 컴포넌트 단 record.
 */

import Link from "next/link";
import { Bot, ChevronRight, LogOut, Moon, Target, UserCheck } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { LogoutMenuButton } from "@/components/profile/LogoutMenuButton";
import { ThemeMenuButton } from "@/components/theme/ThemeMenuButton";
import type {
  ProfileMenuItem,
  ProfileMenuKey,
} from "@/lib/types/profile/menuItems";
import {
  SETTINGS_SECTION_TITLE,
  MENU_THEME,
  MENU_SCORECARD,
  MENU_PAPER_TRADING,
  MENU_ADMIN,
  MENU_LOGOUT,
} from "@/lib/copy/profile/labels";

export interface SettingsMenuCardProps {
  items: ProfileMenuItem[];
  /** 섹션 제목 — 기본 "설정". "관리자 메뉴" 등으로 재사용 시 주입(user-login-auth Phase 2). */
  title?: string;
}

const MENU_LABEL: Record<ProfileMenuKey, string> = {
  THEME: MENU_THEME,
  SCORECARD: MENU_SCORECARD,
  PAPER_TRADING: MENU_PAPER_TRADING,
  ADMIN: MENU_ADMIN,
  LOGOUT: MENU_LOGOUT,
};

const ICON_MAP = {
  Moon,
  Target,
  Bot,
  UserCheck,
  LogOut,
} as const;

export function SettingsMenuCard({
  items,
  title = SETTINGS_SECTION_TITLE,
}: SettingsMenuCardProps) {
  const danger = items.find((item) => item.variant === "danger");
  const defaults = items.filter((item) => item.variant !== "danger");

  return (
    <Section title={title}>
      <ul role="list" className="divide-y divide-border-line">
        {defaults.map((item) => (
          <li key={item.key}>
            {/* THEME 항목만 client 로 분리(3-state 토글 동작) — 나머지는 server MenuButton/Link. */}
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
          <li>
            {/* danger = 로그아웃 — 동작이 필요해 client 컴포넌트로 분리(onClick → 쿠키삭제 → /login). */}
            <LogoutMenuButton />
          </li>
        ) : null}
      </ul>
    </Section>
  );
}

// default(비위험) 설정 항목 — 아이콘 + 라벨 + 우측 chevron. danger(로그아웃)는 LogoutMenuButton 담당.
function MenuButton({ item }: { item: ProfileMenuItem }) {
  const Icon = ICON_MAP[item.iconName];
  return (
    <button type="button" className="profile-menu-row">
      <Icon className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="flex-1 truncate">{MENU_LABEL[item.key]}</span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-text-muted"
        aria-hidden="true"
      />
    </button>
  );
}

// 다른 라우트로 이동하는 항목(href 보유) — 예: 신호 성적표 → /dashboard/scorecard.
function MenuLink({ item }: { item: ProfileMenuItem }) {
  const Icon = ICON_MAP[item.iconName];
  return (
    <Link href={item.href ?? "#"} className="profile-menu-row no-underline">
      <Icon className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="flex-1 truncate">{MENU_LABEL[item.key]}</span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-text-muted"
        aria-hidden="true"
      />
    </Link>
  );
}
