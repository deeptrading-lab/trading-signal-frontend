/**
 * useSidebarCollapsed — 데스크탑 사이드바 접힘 상태 + localStorage 지속.
 *
 * SSR-safe 패턴(useChartOptions / useBreakpoint 동일): 첫 렌더는 기본값(펼침)으로 폴백 →
 *   마운트 후 useEffect 에서 저장값으로 swap(hydration mismatch 0 — 렌더 중 localStorage 미접근).
 *   토글 시 write-through 로 즉시 영구화한다.
 *
 * 반환:
 *   - `collapsed`  : 접힘 여부(true = 아이콘 레일).
 *   - `toggle`     : 접힘 ↔ 펼침 전환(토글 버튼용).
 *   - `setCollapsed`: 명시 지정(필요 시).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SIDEBAR_COLLAPSED,
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/store/layout/sidebarCollapsed";

export type UseSidebarCollapsedResult = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (next: boolean) => void;
};

export function useSidebarCollapsed(): UseSidebarCollapsedResult {
  // SSR/첫 렌더 폴백 — 펼침. 마운트 후 저장값으로 swap.
  const [collapsed, setCollapsedState] = useState<boolean>(
    DEFAULT_SIDEBAR_COLLAPSED,
  );

  useEffect(() => {
    setCollapsedState(readSidebarCollapsed());
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    writeSidebarCollapsed(next);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  return { collapsed, toggle, setCollapsed };
}
