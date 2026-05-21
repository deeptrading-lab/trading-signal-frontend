/**
 * useOutsideClick — ref 외부 mousedown / pointerdown / touchstart 감지 훅.
 *
 * 도메인 무관 (`hooks/utils/`) — dropdown, popover, modal 등 어떤 컴포넌트에서도
 * 재사용 가능. DESIGN.md v5 §Components / outside-click 동작 명세 +
 * PRD #2 (component-compactness) §3.2 / AC-4 를 만족한다.
 *
 * 동작:
 *   - `enabled === true` 이고 ref.current 가 set 됐을 때만 listener attach.
 *   - document mousedown / pointerdown / touchstart 세 종류를 모두 듣는다.
 *     (모바일 터치 + 데스크탑 mouse + pointer 통합 — v5 R3 결정.)
 *   - event.target 이 ref 외부면 onOutside() 발화. ref 안이면 무시.
 *
 * 사용:
 *   ```tsx
 *   const wrapperRef = useRef<HTMLDivElement>(null);
 *   useOutsideClick(wrapperRef, () => setOpen(false), { enabled: open });
 *   ```
 *
 * SSR-safe: document 접근은 useEffect 안에서만 (Next.js App Router 서버 컴포넌트 호환).
 * 신규 라이브러리 0건 (PRD §9.2 PM 권고 = 자체 구현).
 */

"use client";

import { useEffect, type RefObject } from "react";

export type UseOutsideClickOptions = {
  /** false 면 listener attach 안 함 (dropdown 닫힌 상태 등). 기본 true. */
  enabled?: boolean;
};

export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  options?: UseOutsideClickOptions,
): void {
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    function handle(event: MouseEvent | PointerEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (ref.current && ref.current.contains(target)) return;
      onOutside();
    }

    // mousedown + touchstart 두 진입점만으로 데스크탑·모바일 커버.
    // pointerdown 은 mousedown 과 중복 발화하므로 제외 (이중 발화 시 onOutside 가 두 번 호출).
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [ref, onOutside, enabled]);
}
