/**
 * 즐겨찾기 도메인 훅 — ticker-header(메인 영역) + 사이드바 히스토리 항목 (R6 두 진입점) 에서 토글.
 *
 * 외부 인터페이스:
 *   - favorites      : WhitelistItem[] (별표한 종목 목록)
 *   - isFavorite(ticker) : boolean
 *   - toggleFavorite(item) : 추가/제거 토글
 *
 * 정책 (PRD §3.1.2 + DESIGN.md R6):
 *   - in-session 메모리만. 새로고침 시 초기화.
 *   - 같은 ticker 를 다시 토글하면 제거 (히스토리는 영향 없음 — 두 의미는 별개).
 *   - SearchPanel 단계에서는 토글 두지 않음 (탐색 vs 관심 표명 단계 구분).
 */

"use client";

import { useWorkbenchSession } from "@/hooks/workbench/useWorkbenchSession";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";

export type UseFavoritesResult = {
  favorites: WhitelistItem[];
  isFavorite: (ticker: string) => boolean;
  toggleFavorite: (item: WhitelistItem) => void;
};

export function useFavorites(): UseFavoritesResult {
  const { favorites, isFavorite, toggleFavorite } = useWorkbenchSession();
  return { favorites, isFavorite, toggleFavorite };
}
