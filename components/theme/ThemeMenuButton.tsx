"use client";

/**
 * ThemeMenuButton — `/profile` 설정 메뉴의 THEME(다크모드) 항목 (client component).
 *
 * 다크모드 PRD §3.1. SettingsMenuCard 는 server component 라 동작을 못 단다 →
 * THEME 항목만 client 로 분리(LogoutMenuButton 선례). 트리거 행은 SettingsMenuCard 의 MenuButton 과
 * 동일한 `.profile-menu-row`(profile-reskin 공유 플랫 행)를 쓰고, 우측엔 chevron 대신 현재 모드 값을
 * 표시한다. 아래에 light/dark/system 3-state 세그먼트를 편다.
 *
 * 토큰만 사용(hex/px 직타 0). cn 헬퍼로 선택 상태 합성. 토스톤 간결 세그먼트.
 */

import { useState } from "react";
import { Moon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MENU_THEME } from "@/lib/copy/profile/labels";
import {
  THEME_GROUP_LABEL,
  THEME_OPTION_DARK,
  THEME_OPTION_LIGHT,
  THEME_OPTION_SYSTEM,
} from "@/lib/copy/profile/labels";
import {
  useThemeStore,
  type ThemePreference,
} from "@/lib/store/themeStore";

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: "light", label: THEME_OPTION_LIGHT },
  { value: "dark", label: THEME_OPTION_DARK },
  { value: "system", label: THEME_OPTION_SYSTEM },
];

const OPTION_LABEL: Record<ThemePreference, string> = {
  light: THEME_OPTION_LIGHT,
  dark: THEME_OPTION_DARK,
  system: THEME_OPTION_SYSTEM,
};

export function ThemeMenuButton() {
  const [expanded, setExpanded] = useState(false);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <div className="flex flex-col gap-xs">
      {/* 메뉴 행 — SettingsMenuCard MenuButton 과 동일 플랫 행. 클릭 시 세그먼트 토글. */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="profile-menu-row"
      >
        <Moon className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="flex-1 truncate">{MENU_THEME}</span>
        <span className="shrink-0 text-body-sm text-text-muted">
          {OPTION_LABEL[preference]}
        </span>
      </button>

      {expanded ? (
        <div
          role="radiogroup"
          aria-label={THEME_GROUP_LABEL}
          className="mx-md mb-xs grid grid-cols-3 gap-xs rounded-md bg-surface-muted p-xs"
        >
          {OPTIONS.map((option) => {
            const active = option.value === preference;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPreference(option.value)}
                className={cn(
                  "rounded-sm py-sm text-center text-body-sm-strong transition-colors",
                  active
                    ? "bg-surface text-text-strong shadow-sm"
                    : "text-text-muted hover:text-text-strong",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
