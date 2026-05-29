/**
 * WatchlistTable — `/watchlist` 관심종목 테이블 (client component).
 *
 * PR9(finsight-redesign) 신규 → `watchlist-real-data` §3.6·§3.9 실데이터 전환:
 *   - 표시 모델 `WatchlistItem` → `WatchlistQuote`. 행별 삭제 핸들러 `onRemove` 전달.
 *   - 로딩 시 스켈레톤 row placeholder(기존 `bg-surface-muted` 톤).
 *
 * `fix/watchlist-partial-render` — 부분실패 종목 누락 방지(좌조인 렌더):
 *   - 행을 `quotes` 가 아니라 사용자가 담은 `tickers` 기준으로 그린다. 각 ticker 를 `quotes`
 *     에서 by-ticker 매칭하고, 매칭 실패(시세 실패/누락) 시 디그레이드 행을 렌더한다.
 *     → 담은 종목이 화면에서 사라지지 않음.
 *   - 매칭/디그레이드 판정은 행 컴포넌트로 위임(quote prop undefined = 디그레이드).
 *
 * v8 토큰 유지: 12-col grid 카드 셸 + 헤더(surface-muted) + body(divide-y border-line).
 * "관리" 컬럼은 행별 삭제 버튼 노출을 위해 양 뷰포트 모두 표시.
 */

"use client";

import { useMemo } from "react";
import { WatchlistRow } from "./WatchlistRow";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";
import {
  WATCHLIST_TABLE_NAME,
  WATCHLIST_TABLE_PRICE,
  WATCHLIST_TABLE_CHANGE,
  WATCHLIST_TABLE_ACTIONS,
  WATCHLIST_LOADING,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistTableProps {
  /** 사용자가 담은 ticker 배열 — 좌조인 렌더의 기준(행 수 = tickers.length). */
  tickers: readonly string[];
  /** BFF 성공 시세 — ticker 로 매칭. 누락분은 디그레이드 행. */
  quotes: WatchlistQuote[];
  isLoading?: boolean;
  skeletonRows?: number;
  /** ticker → 표시명 fallback(추가 시점 store name → 시드 name). 디그레이드 행 식별용. */
  getName?: (ticker: string) => string | null;
  onRemove: (ticker: string) => void;
}

export function WatchlistTable({
  tickers,
  quotes,
  isLoading = false,
  skeletonRows = 3,
  getName,
  onRemove,
}: WatchlistTableProps) {
  const quoteByTicker = useMemo(
    () => new Map(quotes.map((q) => [q.ticker, q])),
    [quotes],
  );

  return (
    <section className="bg-surface text-text-strong border border-border-line rounded-lg overflow-hidden">
      <div className="grid grid-cols-12 gap-md p-md border-b border-border-line bg-surface-muted text-caption text-text-muted">
        <div className="col-span-4">{WATCHLIST_TABLE_NAME}</div>
        <div className="col-span-3 text-right">{WATCHLIST_TABLE_PRICE}</div>
        <div className="col-span-3 text-right">{WATCHLIST_TABLE_CHANGE}</div>
        <div className="col-span-2 text-right">{WATCHLIST_TABLE_ACTIONS}</div>
      </div>
      <div
        className="divide-y divide-border-line"
        aria-busy={isLoading ? true : undefined}
      >
        {isLoading ? (
          <>
            <span className="sr-only">{WATCHLIST_LOADING}</span>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="grid grid-cols-12 gap-md items-center p-md"
                aria-hidden="true"
              >
                <div className="col-span-4 flex flex-col gap-xs">
                  <div className="skeleton-line skeleton-line-medium" />
                  <div className="skeleton-line skeleton-line-narrow" />
                </div>
                <div className="col-span-3 flex justify-end">
                  <div className="skeleton-line skeleton-line-narrow" />
                </div>
                <div className="col-span-3 flex justify-end">
                  <div className="skeleton-line skeleton-line-narrow" />
                </div>
                <div className="col-span-2" />
              </div>
            ))}
          </>
        ) : (
          tickers.map((ticker) => (
            <WatchlistRow
              key={ticker}
              ticker={ticker}
              quote={quoteByTicker.get(ticker)}
              fallbackName={getName?.(ticker) ?? null}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </section>
  );
}
