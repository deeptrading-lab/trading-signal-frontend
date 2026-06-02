"use client";

/**
 * ThemeProvider — 테마 상태의 클라이언트 경계.
 *
 * 다크모드 PRD §3.1. `app/providers.tsx` 에서 QueryClientProvider 를 감싼다(바깥).
 *
 * 책임(마운트 후 effect):
 *   ① 하이드레이션 — localStorage 의 선택을 store 로 swap(FOUC 스크립트가 이미 적용한 클래스와 정합).
 *   ② system 모드일 때 `matchMedia("(prefers-color-scheme: dark)")` 변경 구독 → resolved 재계산.
 *   ③ cross-tab — `window` `storage` 이벤트로 다른 탭의 테마 변경을 즉시 반영(PRD §9 q3 RESOLVED).
 *
 * 모든 listener 는 cleanup 에서 해제(useBreakpoint 패턴). children 은 그대로 렌더.
 */

import { useEffect, type ReactNode } from "react";
import {
  readThemePreference,
  useThemeStore,
} from "@/lib/store/themeStore";
import { STORAGE_KEY } from "@/lib/store/theme/store";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // ① 마운트 하이드레이션 — 영속 선택을 store 로(서버 기본값 system → 실제 값 swap).
    useThemeStore.getState().hydrate(readThemePreference());

    // ② system 모드 OS 변경 구독 — preference 가 system 일 때만 resolved 가 바뀐다.
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (useThemeStore.getState().preference === "system") {
        useThemeStore.getState().syncResolved();
      }
    };
    mql.addEventListener("change", handleSystemChange);

    // ③ cross-tab — 다른 탭이 테마를 바꾸면 storage 이벤트로 따라간다.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      useThemeStore.getState().hydrate(readThemePreference());
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      mql.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return <>{children}</>;
}
