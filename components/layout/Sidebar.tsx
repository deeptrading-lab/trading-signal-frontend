/**
 * Sidebar — 데스크탑(`>= lg`) 한정 펼쳐진 사이드바.
 *
 * 위치: navbar 아래 좌측 sticky, 너비 spacing.sidebar-w (264px), 세로 100vh - navbar-h.
 * 모바일에서는 hidden (CSS `hidden lg:flex` 합성 토큰 `sidebar` 안에서 처리).
 *
 * 내부 콘텐츠는 SidebarContent 컴포넌트로 분리 — drawer 와 재사용.
 */

"use client";

import { SidebarContent } from "@/components/layout/SidebarContent";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeHistoryEntry } from "@/hooks/workbench/useWorkbenchSession";

type Props = {
  selectedTicker: string | null;
  onSelectHistory: (entry: AnalyzeHistoryEntry) => void;
  onSelectFavorite: (item: WhitelistItem) => void;
};

export function Sidebar({
  selectedTicker,
  onSelectHistory,
  onSelectFavorite,
}: Props) {
  // v5 (component-compactness) nit #1 흡수 — 인라인 60px 직타 제거.
  // navbar 높이 토큰 `{spacing.navbar-h}` 를 Tailwind theme 의 `navbar-h` 키로 호출.
  // `top-navbar-h` / `max-h-[calc(100vh-theme(spacing.navbar-h))]` 둘 다 토큰 참조이며
  // 페이지 어디에도 `60px` 직타는 없다.
  return (
    <aside
      className="sidebar sticky self-start top-navbar-h max-h-[calc(100vh-theme(spacing.navbar-h))]"
    >
      <SidebarContent
        selectedTicker={selectedTicker}
        onSelectHistory={onSelectHistory}
        onSelectFavorite={onSelectFavorite}
      />
    </aside>
  );
}
