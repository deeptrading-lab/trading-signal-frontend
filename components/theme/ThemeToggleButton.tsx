"use client";

/**
 * ThemeToggleButton — 헤더 우측 전역 테마 빠른 토글(light ↔ dark).
 *
 * 모든 라우트가 공유하는 `Header` 에 배치돼 홈을 포함한 어느 탭에서나 한 번에 전환한다.
 * 마이페이지 설정의 3-state(`ThemeMenuButton`, light/dark/system)는 상세 설정으로 유지하고,
 * 본 버튼은 **빠른 2-state 토글** — 현재 적용 테마(`resolvedTheme`)의 반대로 명시 전환한다.
 *   - light 일 때: Moon 아이콘(→ 탭하면 dark)
 *   - dark 일 때:  Sun 아이콘(→ 탭하면 light)
 *
 * 스타일은 `header-profile-button` 합성 토큰을 그대로 써 프로필 아이콘과 톤을 맞춘다(hex/px 직타 0).
 * hydration: 스토어 SSR 기본 `resolvedTheme="light"` 라 첫 렌더는 SSR 과 일치(mismatch 0).
 * 마운트 후 `ThemeProvider` 의 hydrate 로 실제 테마가 반영된다.
 */

import { Moon, Sun } from "lucide-react";
import {
  HEADER_THEME_TO_DARK_ARIA,
  HEADER_THEME_TO_LIGHT_ARIA,
} from "@/lib/copy/layout/navCopy";
import { useThemeStore } from "@/lib/store/themeStore";

export function ThemeToggleButton() {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setPreference = useThemeStore((s) => s.setPreference);
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="header-profile-button"
      aria-label={isDark ? HEADER_THEME_TO_LIGHT_ARIA : HEADER_THEME_TO_DARK_ARIA}
      onClick={() => setPreference(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun aria-hidden="true" />
      ) : (
        <Moon aria-hidden="true" />
      )}
    </button>
  );
}
