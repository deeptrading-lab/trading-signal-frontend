"use client";

/**
 * ThemeToggleButton — 헤더 우측 전역 테마 빠른 토글(light ↔ dark).
 *
 * 모든 라우트가 공유하는 `Header` 에 배치돼 홈을 포함한 어느 탭에서나 한 번에 전환한다.
 * 마이페이지 설정의 3-state(`ThemeMenuButton`, light/dark/system)는 상세 설정으로 유지하고,
 * 본 버튼은 **빠른 2-state 토글** — 현재 적용 테마(`resolvedTheme`)의 반대로 명시 전환한다.
 *
 * 비주얼: 달↔해가 회전+스케일로 크로스페이드(uiverse santosh-sarkar/terrible-mole-8 참고).
 *   - 아이콘 표시/애니메이션은 `app/components.css` 의 `.theme-toggle-icon*` 가 **html.dark 클래스**로
 *     구동 → FOUC 스크립트가 paint 전에 클래스를 적용하므로 hydration 깜빡임 0(아이콘 상태를 React 가
 *     렌더하지 않음). 본 컴포넌트는 클릭 동작과 aria-label(현재 테마 기준)만 담당.
 *   - light → 해(sun) 표시 / dark → 달(moon) 표시. SVG path 는 heroicons(uiverse 원본) 그대로.
 */

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
      className="theme-toggle"
      aria-label={isDark ? HEADER_THEME_TO_LIGHT_ARIA : HEADER_THEME_TO_DARK_ARIA}
      onClick={() => setPreference(isDark ? "light" : "dark")}
    >
      {/* 달 — dark 일 때 표시(회전+스케일 인). */}
      <svg
        className="theme-toggle-icon theme-toggle-icon--moon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
          clipRule="evenodd"
        />
      </svg>
      {/* 해 — light 일 때 표시(기본). */}
      <svg
        className="theme-toggle-icon theme-toggle-icon--sun"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>
    </button>
  );
}
