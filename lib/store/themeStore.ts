/**
 * 테마 상태 스토어 (zustand) — light/dark/system 3-state + 해석된 실제 테마.
 *
 * 다크모드 PRD §3.1. next-themes 미도입(프로젝트 관성 = Zustand+localStorage, watchlist 선례).
 *
 * 경계:
 *   - `preference` = 사용자 선택(영속, localStorage). `resolvedTheme` = 실제 적용 색(light|dark).
 *     system 일 때 resolvedTheme 는 OS prefers-color-scheme 로 해석된다.
 *   - 영속/하이드레이션/matchMedia·storage 구독은 `lib/store/theme/store.ts` +
 *     `components/theme/ThemeProvider.tsx` 가 담당. 본 스토어는 상태+클래스 적용만.
 *   - `applyThemeClass` 는 `<html>` 클래스/colorScheme 를 직접 만지므로 React 밖에서도 호출 가능
 *     (FOUC 스크립트와 동일한 결과를 보장 — hydration mismatch 0).
 */

import { create } from "zustand";
import {
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/store/theme/store";

export type ResolvedTheme = "light" | "dark";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** OS prefers-color-scheme 로 다크 여부 해석. SSR/미지원 시 light. */
export function resolveFromSystem(): ResolvedTheme {
  if (!hasWindow() || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** preference → 실제 적용 테마 해석(system 이면 OS 질의). */
function resolvePreference(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? resolveFromSystem() : preference;
}

/** `<html>` 에 dark 클래스·colorScheme 적용. FOUC 스크립트와 동일 동작(SSR no-op). */
export function applyThemeClass(resolved: ResolvedTheme): void {
  if (!hasWindow()) return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

type ThemeState = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  /** 사용자가 토글에서 선택 — 영속 + resolved 재계산 + 클래스 적용. */
  setPreference: (preference: ThemePreference) => void;
  /** ThemeProvider 가 마운트 시 localStorage 값으로 store 를 맞춘다(영속 write 없음). */
  hydrate: (preference: ThemePreference) => void;
  /** system 모드에서 OS 변경/cross-tab 시 resolved 만 재계산 + 클래스 적용. */
  syncResolved: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  // SSR 기본값 — system. 실제 값은 마운트 시 hydrate 로 swap(FOUC 스크립트가 이미 클래스 적용).
  preference: "system",
  resolvedTheme: "light",
  setPreference: (preference) => {
    writeThemePreference(preference);
    const resolved = resolvePreference(preference);
    applyThemeClass(resolved);
    set({ preference, resolvedTheme: resolved });
  },
  hydrate: (preference) => {
    const resolved = resolvePreference(preference);
    applyThemeClass(resolved);
    set({ preference, resolvedTheme: resolved });
  },
  syncResolved: () => {
    const resolved = resolvePreference(get().preference);
    applyThemeClass(resolved);
    set({ resolvedTheme: resolved });
  },
}));

/** localStorage 영속값을 그대로 노출(ThemeProvider 마운트 하이드레이션용). */
export { readThemePreference };
export type { ThemePreference };
