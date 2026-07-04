/**
 * 데스크탑 사이드바 접힘 상태 영구화 — 저장소 격리 모듈.
 *
 * 사용자가 좌측 사이드바를 접으면(아이콘 레일) 그 상태를 브라우저에 저장해 재방문 시 유지한다.
 * `lib/store/chart/chartOptions.ts` 의 `hasWindow()` 가드 패턴을 복제(SSR no-op).
 *
 * 저장값: boolean(`true` = 접힘 / `false` = 펼침). 미설정/파싱 실패 시 기본값(펼침) 폴백.
 * 영구화 실패(quota 등)는 화면 동작을 막지 않는다 — 메모리 state 는 유지.
 *
 * SSR 안전: 첫 렌더는 항상 기본값(펼침)으로 폴백하고, 마운트 후 `useSidebarCollapsed` 훅이
 * 저장값으로 swap 한다(hydration mismatch 0 — 렌더 중 localStorage 를 읽지 않는다).
 */

/** 기본값 — 펼침(false). SSR/미설정/파싱 실패 폴백. */
export const DEFAULT_SIDEBAR_COLLAPSED = false;

/** 본 모듈·useSidebarCollapsed 훅이 공유하는 단일 키. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "finsight:sidebar-collapsed";

function hasWindow(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

/** 영구화된 접힘 상태를 읽는다. 미설정/파싱 실패 시 기본값(펼침). SSR 안전. */
export function readSidebarCollapsed(): boolean {
  if (!hasWindow()) return DEFAULT_SIDEBAR_COLLAPSED;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (raw === null) return DEFAULT_SIDEBAR_COLLAPSED;
    return raw === "true";
  } catch {
    return DEFAULT_SIDEBAR_COLLAPSED;
  }
}

/** 접힘 상태를 영구화한다. SSR/실패 시 no-op. */
export function writeSidebarCollapsed(collapsed: boolean): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      collapsed ? "true" : "false",
    );
  } catch {
    // quota 초과 등 — 영구화 실패는 무시(메모리 state 유지).
  }
}
