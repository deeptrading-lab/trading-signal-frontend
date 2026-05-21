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
  return (
    <aside
      className="sidebar sticky self-start"
      style={{ top: "var(--navbar-sticky-top, 60px)", maxHeight: "calc(100vh - 60px)" }}
    >
      <SidebarContent
        selectedTicker={selectedTicker}
        onSelectHistory={onSelectHistory}
        onSelectFavorite={onSelectFavorite}
      />
    </aside>
  );
}
