/**
 * WatchlistTable — `/watchlist` 관심종목 테이블 (server component).
 *
 * PR9 (finsight-redesign) 신규.
 *
 * 시안 `Watchlist.tsx` L25~L73 정합 — 12-col grid 테이블 카드 셸 + 헤더 + body (divide-y).
 *
 * 구조:
 *   1. 카드 셸 (`card` 합성 토큰, overflow-hidden 으로 row hover 시 border 보존).
 *   2. 테이블 헤더 (12-col grid, surface-muted 배경, text-caption + text-text-muted).
 *   3. 테이블 body (divide-y border-line, WatchlistRow map).
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰 (rounded.lg + border + card padding).
 *     단 본 테이블은 row 가 자체 hover padding 을 가지므로 카드 내부 padding 0 — `card` 가 아닌
 *     수동 조합: `bg-surface text-text-strong border border-border-line rounded-lg overflow-hidden`.
 *   - 헤더 = `bg-surface-muted border-b border-border-line text-caption text-text-muted`.
 *   - body divide-y = `divide-y divide-border-line` (row 사이 구분).
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { WatchlistRow } from "./WatchlistRow";
import type { WatchlistItem } from "@/lib/types/watchlist/items";
import {
  WATCHLIST_TABLE_NAME,
  WATCHLIST_TABLE_PRICE,
  WATCHLIST_TABLE_CHANGE,
  WATCHLIST_TABLE_ACTIONS,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistTableProps {
  items: WatchlistItem[];
}

export function WatchlistTable({ items }: WatchlistTableProps) {
  return (
    <section className="bg-surface text-text-strong border border-border-line rounded-lg overflow-hidden">
      {/* 테이블 헤더 — 12-col grid 정합. */}
      <div className="grid grid-cols-12 gap-md p-md border-b border-border-line bg-surface-muted text-caption text-text-muted">
        <div className="col-span-5 md:col-span-4">{WATCHLIST_TABLE_NAME}</div>
        <div className="col-span-4 md:col-span-3 text-right">
          {WATCHLIST_TABLE_PRICE}
        </div>
        <div className="col-span-3 md:col-span-3 text-right">
          {WATCHLIST_TABLE_CHANGE}
        </div>
        <div className="hidden md:block col-span-2 text-right">
          {WATCHLIST_TABLE_ACTIONS}
        </div>
      </div>
      {/* 테이블 body — divide-y border-line. */}
      <div className="divide-y divide-border-line">
        {items.map((item) => (
          <WatchlistRow key={item.symbol} item={item} />
        ))}
      </div>
    </section>
  );
}
