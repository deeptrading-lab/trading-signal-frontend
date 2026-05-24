/**
 * WatchlistPage — `/watchlist` 셸 컴포저 (server component).
 *
 * PR9 (finsight-redesign) 신규.
 *
 * 책임:
 *   - 페이지 헤더 (Star 아이콘 + "관심종목" + "+ 그룹 추가" 버튼).
 *   - WatchlistTable 전폭 카드.
 *
 * v8 토큰:
 *   - 페이지 컨테이너 = `mx-auto max-w-main-max-w flex flex-col gap-lg`.
 *   - Star 아이콘 = `text-warn fill-warn` (시안의 `text-yellow-500 fill-yellow-500` v8 cascade —
 *     warn 토큰이 brown-ish orange 로 유사한 강조 톤 흡수, hex/px 직타 0 유지).
 *   - 페이지 타이틀 = `text-h1 text-text-strong`.
 *   - "+ 그룹 추가" = `button-primary` 합성 토큰 (accent-vivid bg).
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 *
 * BFF 무관 — PR9 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "관심종목" 메뉴 활성 — `isNavItemActive("/watchlist", "/watchlist")` true.
 */

import { Star } from "lucide-react";
import { WatchlistTable } from "./WatchlistTable";
import type { WatchlistItem } from "@/lib/types/watchlist/items";
import {
  WATCHLIST_PAGE_TITLE,
  WATCHLIST_ADD_GROUP,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistPageProps {
  items: WatchlistItem[];
}

export function WatchlistPage({ items }: WatchlistPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="inline-flex items-center gap-sm text-h1 text-text-strong">
          <Star
            className="h-2xl w-2xl text-warn fill-warn"
            aria-hidden="true"
          />
          {WATCHLIST_PAGE_TITLE}
        </h1>
        <button type="button" className="button-primary">
          {WATCHLIST_ADD_GROUP}
        </button>
      </div>
      <WatchlistTable items={items} />
    </div>
  );
}
