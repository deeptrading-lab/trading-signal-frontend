/**
 * WatchlistTable — `/watchlist` 관심종목 목록 (client component).
 *
 * PR9(finsight-redesign) → `watchlist-real-data` §3.6 → **watchlist-reskin**(카드리스 플랫 표).
 *
 * watchlist-reskin — 홈 랭킹(`RealtimeRankingSection`) 정합:
 *   - 아웃라인 카드 박스(`border rounded-lg`) + 컬럼 헤더행(종목명/현재가/등락률/관리) **폐기**.
 *     → 흰 바탕 위 `role="list"` + `WatchlistRow`(`ListRow` 헤어라인)만. 토스 톤 플랫 목록.
 *   - 로딩은 플랫 스켈레톤 행(홈 `RankSkeleton` 정합 — 박스 없이 헤어라인 + `Skeleton` 원자).
 *
 * 좌조인 렌더(`fix/watchlist-partial-render`): 행을 `quotes` 가 아니라 사용자가 담은 `tickers` 기준으로
 *   그린다. 각 ticker 를 `quotes` 에서 매칭하고, 실패(시세 누락) 시 디그레이드 행(행 컴포넌트 판정,
 *   quote prop undefined = 디그레이드)으로 남긴다 → 담은 종목이 화면에서 사라지지 않는다.
 */

"use client";

import { useMemo } from "react";
import { WatchlistRow } from "./WatchlistRow";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";
import type { StockWarningItem } from "@/lib/types/stock/warnings";
import { WATCHLIST_LOADING } from "@/lib/copy/watchlist/labels";

export interface WatchlistTableProps {
  /** 사용자가 담은 ticker 배열 — 좌조인 렌더의 기준(행 수 = tickers.length). */
  tickers: readonly string[];
  /** BFF 성공 시세 — ticker 로 매칭. 누락분은 디그레이드 행. */
  quotes: WatchlistQuote[];
  /** 티커별 활성 매수 유의(경보·VI) — 빈 맵/미제공이면 칩 미표시(fail-soft). */
  warningsByTicker?: Record<string, StockWarningItem[]>;
  isLoading?: boolean;
  skeletonRows?: number;
  /** ticker → 표시명 fallback(추가 시점 store name → 시드 name). 디그레이드 행 식별용. */
  getName?: (ticker: string) => string | null;
  onRemove: (ticker: string) => void;
}

export function WatchlistTable({
  tickers,
  quotes,
  warningsByTicker,
  isLoading = false,
  skeletonRows = 3,
  getName,
  onRemove,
}: WatchlistTableProps) {
  const quoteByTicker = useMemo(
    () => new Map(quotes.map((q) => [q.ticker, q])),
    [quotes],
  );

  if (isLoading) {
    return <WatchlistSkeleton rows={skeletonRows} />;
  }

  return (
    <div role="list">
      {tickers.map((ticker) => (
        <WatchlistRow
          key={ticker}
          ticker={ticker}
          quote={quoteByTicker.get(ticker)}
          fallbackName={getName?.(ticker) ?? null}
          warnings={warningsByTicker?.[ticker]}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

/** 로딩 — 플랫 스켈레톤 행(홈 RankSkeleton 정합: 박스 없이 헤어라인 + Skeleton 원자). */
function WatchlistSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy="true" aria-label={WATCHLIST_LOADING}>
      <span className="sr-only">{WATCHLIST_LOADING}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-md border-b border-border-line py-md last:border-b-0"
          aria-hidden="true"
        >
          <Skeleton variant="line" className="mb-0 h-8 w-8 rounded-sm" />
          <Skeleton variant="line" className="mb-0 h-4 w-1/3" />
          <Skeleton variant="line" className="mb-0 ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
