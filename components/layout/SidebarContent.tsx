/**
 * SidebarContent — sidebar(데스크탑) 와 drawer(모바일) 가 동일 콘텐츠를 호스팅한다.
 *
 * DESIGN.md v4 §Do's and Don'ts: "drawer 와 sidebar 는 동일 콘텐츠를 호스팅한다.
 * 콘텐츠 컴포넌트(<SidebarContent />) 를 분리해 두 곳에서 재사용한다."
 *
 * 섹션 구성 (R1 결정):
 *   1. 분석 히스토리 (LRU 최대 5)
 *   2. 즐겨찾기 (in-session)
 *
 * 항목 클릭 시 onSelect 콜백 → 메인 영역의 ticker 복원 + (모바일이라면) 드로어 자동 닫힘.
 */

"use client";

import { useAnalyzeHistory } from "@/hooks/workbench/useAnalyzeHistory";
import { useFavorites } from "@/hooks/workbench/useFavorites";
import { SidebarItem } from "@/components/layout/SidebarItem";
import {
  SIDEBAR_SECTION_HISTORY,
  SIDEBAR_SECTION_FAVORITES,
  SIDEBAR_EMPTY_HISTORY,
  SIDEBAR_EMPTY_FAVORITES,
  SIDEBAR_EMPTY_HINT,
} from "@/lib/copy/workbench/layoutCopy";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeHistoryEntry } from "@/hooks/workbench/useWorkbenchSession";

type Props = {
  selectedTicker: string | null;
  /** 히스토리 항목 클릭 — 메인 영역으로 ticker + 입력값 복원. */
  onSelectHistory: (entry: AnalyzeHistoryEntry) => void;
  /** 즐겨찾기 항목 클릭 — ticker 만 복원 (입력값은 사용자 재입력). */
  onSelectFavorite: (item: WhitelistItem) => void;
};

export function SidebarContent({
  selectedTicker,
  onSelectHistory,
  onSelectFavorite,
}: Props) {
  const { history } = useAnalyzeHistory();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  return (
    <nav aria-label="워크벤치 사이드바" className="flex flex-col gap-xl w-full">
      {/* 분석 히스토리 섹션 */}
      <section aria-label={SIDEBAR_SECTION_HISTORY}>
        <header className="sidebar-section-header">{SIDEBAR_SECTION_HISTORY}</header>
        <div className="mt-sm flex flex-col gap-xs">
          {history.length === 0 ? (
            <div className="sidebar-empty">
              <p>{SIDEBAR_EMPTY_HISTORY}</p>
              <p className="mt-xs text-text-muted">{SIDEBAR_EMPTY_HINT}</p>
            </div>
          ) : (
            history.map((entry) => {
              // 히스토리 항목의 WhitelistItem 표면을 재구성 — 토글에 필요한 메타만.
              const item: WhitelistItem = {
                ticker: entry.ticker,
                name: entry.name,
                asset_type: "",
                exchange: "",
                currency: entry.currency,
                sector: "",
                risk_tier: "",
                aliases: [],
              };
              return (
                <SidebarItem
                  key={entry.ticker}
                  item={item}
                  subLabel={entry.name || entry.currency}
                  isActive={entry.ticker === selectedTicker}
                  isFavorite={isFavorite(entry.ticker)}
                  onSelect={() => onSelectHistory(entry)}
                  onToggleFavorite={() => toggleFavorite(item)}
                />
              );
            })
          )}
        </div>
      </section>

      {/* 즐겨찾기 섹션 */}
      <section aria-label={SIDEBAR_SECTION_FAVORITES}>
        <header className="sidebar-section-header">{SIDEBAR_SECTION_FAVORITES}</header>
        <div className="mt-sm flex flex-col gap-xs">
          {favorites.length === 0 ? (
            <div className="sidebar-empty">
              <p>{SIDEBAR_EMPTY_FAVORITES}</p>
              <p className="mt-xs text-text-muted">{SIDEBAR_EMPTY_HINT}</p>
            </div>
          ) : (
            favorites.map((item) => (
              <SidebarItem
                key={item.ticker}
                item={item}
                subLabel={item.name || item.currency}
                isActive={item.ticker === selectedTicker}
                isFavorite={true}
                onSelect={() => onSelectFavorite(item)}
                onToggleFavorite={() => toggleFavorite(item)}
              />
            ))
          )}
        </div>
      </section>
    </nav>
  );
}
