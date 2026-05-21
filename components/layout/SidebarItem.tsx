/**
 * SidebarItem — 사이드바·드로어 내부의 단일 항목.
 *
 * 좌측 = ticker · 부속 라벨 (name 또는 통화)
 * 우측 = 별표 토글 (FavoriteToggle).
 *
 * 활성 상태(`isActive`) = 현재 메인 영역에 선택된 ticker 와 동일. `sidebar-item-active`
 * 합성 토큰을 호출 + `aria-current="page"` 표시.
 *
 * 클릭 시 onSelect 콜백 — 사이드바에서 클릭하면 메인 영역의 ticker 가 복원되고, 모바일에서는
 * 드로어가 자동 닫힘 (드로어 호스트가 책임).
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { FavoriteToggle } from "@/components/layout/FavoriteToggle";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";

type Props = {
  item: WhitelistItem;
  /** 부속 라벨 — 예: "Apple Inc." 또는 통화. 비어 있으면 ticker 만 한 줄. */
  subLabel?: string;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

export function SidebarItem({
  item,
  subLabel,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      className={cn("sidebar-item", isActive && "sidebar-item-active")}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="min-w-0 flex flex-col text-left">
        <strong className="text-body-sm font-bold truncate">{item.ticker}</strong>
        {subLabel ? (
          <span className="text-caption text-text-muted truncate">{subLabel}</span>
        ) : null}
      </span>
      <FavoriteToggle isFavorite={isFavorite} onToggle={onToggleFavorite} />
    </div>
  );
}
