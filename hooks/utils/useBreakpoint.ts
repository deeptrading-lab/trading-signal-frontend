/**
 * useBreakpoint — 도메인 무관 React 훅. JS 측 1차 반응형 도구.
 *
 * 반환 형태: { isMobile, isTablet, isDesktop } (boolean 셋).
 *   - isMobile: viewport `< md` (즉 `< 768px`)
 *   - isTablet: viewport `>= md` 이고 `< lg` (즉 `768 ~ 1023px`)
 *   - isDesktop: viewport `>= lg` (즉 `>= 1024px`)
 *
 * 경계값은 DESIGN.md `breakpoints` 토큰(`docs/design/workbench-analyze-rebuild.md`) 단일 진실 원천을
 * 그대로 따른다. Tailwind 기본 정합 (sm 640 / md 768 / lg 1024 / xl 1280).
 *
 * SSR-safe — 서버·첫 클라이언트 렌더는 항상 `isMobile: true` (모바일 퍼스트) 로 응답한다.
 * 클라이언트 마운트 후 `useEffect` 안에서 `matchMedia` 실제 값으로 swap → hydration mismatch 0건.
 *
 * 사용 가이드 (`docs/rules/frontend.md` §8 "반응형"):
 *   - CSS 측 레이아웃 변경(`grid-cols`, `max-w`, `padding` 등) 은 Tailwind 반응형 prefix(`md:`/`lg:`) 우선.
 *   - 본 훅은 JS 분기가 필요한 케이스(조건부 렌더, 이벤트 바인딩 분기, 동적 동작)에 한정해 사용.
 *   - `window.innerWidth` 직접 검사 금지(SSR-unsafe + listener 누락).
 *   - `matchMedia` 직접 호출 금지 — 컴포넌트는 본 훅만 import.
 */

"use client";

import { useEffect, useState } from "react";

export interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// 경계값 — DESIGN.md `breakpoints` 토큰과 동기화 의무 (frontend.md §8).
// 현재 값: Tailwind 기본 정합 (md 768 / lg 1024).
const MD_QUERY = "(min-width: 768px)";
const LG_QUERY = "(min-width: 1024px)";

// SSR 초기값 — 모바일 퍼스트 (PRD §3.3 / §9 RESOLVED).
// 서버·첫 클라이언트 렌더가 항상 이 값으로 일치 → hydration mismatch 0건.
const INITIAL_STATE: BreakpointState = {
  isMobile: true,
  isTablet: false,
  isDesktop: false,
};

function readState(): BreakpointState {
  // SSR / matchMedia 미지원 환경 안전망.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return INITIAL_STATE;
  }
  const mdMatch = window.matchMedia(MD_QUERY).matches;
  const lgMatch = window.matchMedia(LG_QUERY).matches;
  return {
    isMobile: !mdMatch,
    isTablet: mdMatch && !lgMatch,
    isDesktop: lgMatch,
  };
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(INITIAL_STATE);

  useEffect(() => {
    // 마운트 직후 1회 실제 값으로 swap (서버 모바일 퍼스트 → 실제 viewport 반영).
    setState(readState());

    const mdMql = window.matchMedia(MD_QUERY);
    const lgMql = window.matchMedia(LG_QUERY);

    function handleChange() {
      setState(readState());
    }

    mdMql.addEventListener("change", handleChange);
    lgMql.addEventListener("change", handleChange);

    // StrictMode 더블 마운트 대응 — cleanup 에서 반드시 listener 제거.
    return () => {
      mdMql.removeEventListener("change", handleChange);
      lgMql.removeEventListener("change", handleChange);
    };
  }, []);

  return state;
}
