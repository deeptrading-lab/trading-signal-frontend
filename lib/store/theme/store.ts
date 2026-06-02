/**
 * 테마 선택 영구화 — 저장소 격리 모듈.
 *
 * 다크모드 PRD §3.1 — 본 모듈이 **유일한 테마 localStorage 접근점**이다.
 * `lib/api/watchlist/store.ts` 의 `hasWindow()` 가드 패턴을 복제했다(SSR no-op).
 *
 * 저장값: "light" | "dark" | "system"(미설정/파싱실패 시 "system" 폴백 = 기기 설정 따라가기).
 * 영구화 실패(quota 등)는 화면 동작을 막지 않는다 — 메모리 state 는 유지.
 */

/** 사용자가 선택한 테마 모드. system = 기기 prefers-color-scheme 따라가기(기본값). */
export type ThemePreference = "light" | "dark" | "system";

/** 본 모듈·ThemeProvider·FOUC 스크립트가 공유하는 단일 키. */
export const STORAGE_KEY = "finsight:theme";

function hasWindow(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function isPreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** 영구화된 테마 선택을 읽는다. 미설정/파싱 실패 시 "system". SSR 안전. */
export function readThemePreference(): ThemePreference {
  if (!hasWindow()) return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isPreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

/** 테마 선택을 영구화한다. SSR/실패 시 no-op. */
export function writeThemePreference(preference: ThemePreference): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // quota 초과 등 — 영구화 실패는 무시(메모리 state 유지).
  }
}
