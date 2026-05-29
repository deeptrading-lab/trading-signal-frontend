/**
 * WatchlistRow — `/watchlist` 테이블 1 row (client component).
 *
 * PR9(finsight-redesign) 신규 → `watchlist-real-data` §3.6 실데이터 전환:
 *   - 표시 모델이 `WatchlistItem`(문자열 priceDisplay) → `WatchlistQuote`(number price) 로 교체.
 *     천단위 콤마·등락률 부호는 본 컴포넌트에서 `formatNumber`/`formatPct` 로 변환.
 *   - 행별 삭제 버튼 신설(§9 q5) — `onRemove(ticker)`. 행 본문 클릭 시 `/profile/[ticker]` 라우팅.
 *   - 거래정지/관리종목 경고 배지 — 기존 `badge-critical`/`badge-warn` 토큰(신규 토큰 0, §9 q6).
 *
 * v8 토큰 유지: 12-col grid · 등락 칩 `badge-signal-up`/`badge-signal-down`(상승 빨강/하락 파랑) ·
 *   row hover `hover:bg-surface-muted` · 삭제 버튼 `button-icon`.
 */

"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";
import {
  WATCHLIST_BADGE_TRADE_STOPPED,
  WATCHLIST_BADGE_ADMIN_ITEM,
  WATCHLIST_REMOVE_LABEL,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistRowProps {
  quote: WatchlistQuote;
  onRemove: (ticker: string) => void;
}

export function WatchlistRow({ quote, onRemove }: WatchlistRowProps) {
  const router = useRouter();
  const isUp = quote.direction === "up";
  const isFlat = quote.direction === "flat";
  const signalBadgeClass = isUp ? "badge-signal-up" : "badge-signal-down";

  return (
    <div
      className="grid grid-cols-12 gap-md items-center p-md transition-colors hover:bg-surface-muted cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/profile/${quote.ticker}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/profile/${quote.ticker}`);
        }
      }}
    >
      <div className="col-span-4 md:col-span-4 flex items-center gap-sm min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-xs">
            <span className="text-body-strong text-text-strong truncate">
              {quote.name}
            </span>
            {quote.isTradeStopped ? (
              <span className="badge-critical">
                {WATCHLIST_BADGE_TRADE_STOPPED}
              </span>
            ) : null}
            {quote.isAdminItem ? (
              <span className="badge-warn">{WATCHLIST_BADGE_ADMIN_ITEM}</span>
            ) : null}
          </div>
          <div className="text-caption text-text-muted">{quote.ticker}</div>
        </div>
      </div>

      <div className="col-span-3 md:col-span-3 text-right text-body-strong text-text-strong tabular-nums">
        {formatNumber(quote.price)}
      </div>

      <div className="col-span-3 md:col-span-3 flex justify-end">
        <span
          className={cn(
            "tabular-nums",
            isFlat ? "badge-accent" : signalBadgeClass,
          )}
        >
          {formatPct(quote.changePercent, { sign: true })}
        </span>
      </div>

      <div className="col-span-2 flex justify-end">
        <button
          type="button"
          className="button-icon"
          aria-label={`${quote.name} ${WATCHLIST_REMOVE_LABEL}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(quote.ticker);
          }}
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
