/**
 * useMediaQuery — 임의 media query 매칭 boolean (SSR-safe). `useBreakpoint` 의 일반형.
 *
 * `useBreakpoint` 는 md/lg 고정 경계만 다룬다. 그 밖의 임계(예: 초광폭 우측 도킹 게이트)가 필요할 때
 * 이 훅으로 임의 쿼리를 구독한다. 컴포넌트는 `window.innerWidth`·`matchMedia` 직접 호출 대신 본 훅을
 * 쓴다(frontend.md §8 — matchMedia 캡슐화는 hooks/utils 안에서만).
 *
 * SSR 초기값 = false(enhancement 기본 off) → 마운트 후 실제 매칭으로 swap(hydration mismatch 0).
 * StrictMode 더블 마운트 대응 cleanup 에서 listener 제거.
 */

"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mql = window.matchMedia(query);
    setMatches(mql.matches); // 마운트 직후 실제 값으로 swap.
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
