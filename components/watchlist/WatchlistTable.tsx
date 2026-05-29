/**
 * WatchlistTable — `/watchlist` 관심종목 테이블 (client component).
 *
 * PR9(finsight-redesign) 신규 → `watchlist-real-data` §3.6·§3.9 실데이터 전환:
 *   - 표시 모델 `WatchlistItem` → `WatchlistQuote`. 행별 삭제 핸들러 `onRemove` 전달.
 *   - 로딩 시 스켈레톤 row placeholder(기존 `bg-surface-muted` 톤).
 *
 * v8 토큰 유지: 12-col grid 카드 셸 + 헤더(surface-muted) + body(divide-y border-line).
 * "관리" 컬럼은 행별 삭제 버튼 노출을 위해 양 뷰포트 모두 표시.
 */

"use client";

import { WatchlistRow } from "./WatchlistRow";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";
import {
  WATCHLIST_TABLE_NAME,
  WATCHLIST_TABLE_PRICE,
  WATCHLIST_TABLE_CHANGE,
  WATCHLIST_TABLE_ACTIONS,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistTableProps {
  quotes: WatchlistQuote[];
  isLoading?: boolean;
  skeletonRows?: number;
  onRemove: (ticker: string) => void;
}

export function WatchlistTable({
  quotes,
  isLoading = false,
  skeletonRows = 3,
  onRemove,
}: WatchlistTableProps) {
  return (
    <section className="bg-surface text-text-strong border border-border-line rounded-lg overflow-hidden">
      <div className="grid grid-cols-12 gap-md p-md border-b border-border-line bg-surface-muted text-caption text-text-muted">
        <div className="col-span-4">{WATCHLIST_TABLE_NAME}</div>
        <div className="col-span-3 text-right">{WATCHLIST_TABLE_PRICE}</div>
        <div className="col-span-3 text-right">{WATCHLIST_TABLE_CHANGE}</div>
        <div className="col-span-2 text-right">{WATCHLIST_TABLE_ACTIONS}</div>
      </div>
      <div className="divide-y divide-border-line">
        {isLoading
          ? Array.from({ length: skeletonRows }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-md items-center p-md"
                aria-hidden="true"
              >
                <div className="col-span-4 flex flex-col gap-xs">
                  <div className="h-4 w-2/3 rounded-pill bg-surface-muted" />
                  <div className="h-3 w-1/3 rounded-pill bg-surface-muted" />
                </div>
                <div className="col-span-3 flex justify-end">
                  <div className="h-4 w-1/2 rounded-pill bg-surface-muted" />
                </div>
                <div className="col-span-3 flex justify-end">
                  <div className="h-4 w-1/2 rounded-pill bg-surface-muted" />
                </div>
                <div className="col-span-2" />
              </div>
            ))
          : quotes.map((quote) => (
              <WatchlistRow
                key={quote.ticker}
                quote={quote}
                onRemove={onRemove}
              />
            ))}
      </div>
    </section>
  );
}
