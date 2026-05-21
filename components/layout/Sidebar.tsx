/**
 * Sidebar — 데스크탑(`>= lg`) 한정 펼쳐진 사이드바.
 *
 * 위치: navbar 아래 좌측 sticky, 너비 spacing.sidebar-w (264px), 세로 100vh - navbar-h.
 * 모바일에서는 hidden (CSS `hidden lg:flex` 합성 토큰 `sidebar` 안에서 처리).
 *
 * 내부 콘텐츠는 SidebarContent 컴포넌트로 분리 — drawer 와 재사용.
 *
 * v7 (design-tone-refinement) — PRD §3.2 결함 2 fix:
 *   - 기존 `self-start` 가 flex item 의 stretch 를 차단 → 사이드바가 내부 콘텐츠 높이만큼만
 *     차지하고 그 아래로 surface-muted 의 회색 빈 공간 노출 (사용자 지적).
 *   - `self-start` 제거 + `min-h-[calc(100vh-theme(spacing.navbar-h))]` 추가 →
 *     데스크탑에서 사이드바가 navbar 아래 viewport 끝까지 stretched.
 *   - sticky 동작은 그대로 — 상위 flex 의 stretch 가 적용된 후에도 sticky top 정합.
 *   - 모바일 drawer (`MobileDrawer`) 는 본 컴포넌트 무관 — `hidden lg:flex` 가 모바일 차단.
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
  // v5 nit #1 흡수 — 인라인 60px 직타 제거. navbar 높이 토큰 `{spacing.navbar-h}` 를
  // Tailwind theme 의 `navbar-h` 키로 호출.
  // v7 PRD §3.2 — `self-start` 제거 + `min-h-[calc(100vh-...)]` 추가 → viewport 끝까지 stretched.
  // 두 클래스 모두 토큰 참조이며 페이지 어디에도 `60px` 직타는 없다.
  return (
    <aside
      className="sidebar sticky top-navbar-h min-h-[calc(100vh-theme(spacing.navbar-h))] max-h-[calc(100vh-theme(spacing.navbar-h))]"
      data-component="sidebar"
    >
      <SidebarContent
        selectedTicker={selectedTicker}
        onSelectHistory={onSelectHistory}
        onSelectFavorite={onSelectFavorite}
      />
    </aside>
  );
}
