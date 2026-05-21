/**
 * FavoriteToggle — ticker 별표 토글 버튼.
 *
 * R6 두 진입점에서 동일 컴포넌트 재사용:
 *   - ticker-header (메인 영역, 선택된 ticker 옆)
 *   - 사이드바 히스토리 항목 우측
 *
 * 합성 토큰 `favorite-toggle` / `favorite-toggle-active` (app/components.css) 호출.
 * 시각만이 아니라 텍스트 라벨도 ARIA 로 병행 (AC-16 무회귀).
 */

"use client";

import { cn } from "@/lib/utils/cn";
import {
  FAVORITE_TOGGLE_ARIA_ADD,
  FAVORITE_TOGGLE_ARIA_REMOVE,
} from "@/lib/copy/workbench/layoutCopy";

type Props = {
  isFavorite: boolean;
  onToggle: () => void;
  /** 추가 className 합성용 (예: 사이드바 항목 안에서 위치 조정). */
  className?: string;
};

export function FavoriteToggle({ isFavorite, onToggle, className }: Props) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? FAVORITE_TOGGLE_ARIA_REMOVE : FAVORITE_TOGGLE_ARIA_ADD}
      className={cn(
        isFavorite ? "favorite-toggle favorite-toggle-active" : "favorite-toggle",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
    </button>
  );
}
