/**
 * WatchlistRow — `/watchlist` 테이블 1 row (client component).
 *
 * PR9(finsight-redesign) 신규 → `watchlist-real-data` §3.6 실데이터 전환:
 *   - 표시 모델이 `WatchlistItem`(문자열 priceDisplay) → `WatchlistQuote`(number price) 로 교체.
 *     천단위 콤마·등락률 부호는 본 컴포넌트에서 `formatNumber`/`formatPct` 로 변환.
 *   - 행별 삭제 버튼 신설(§9 q5) — `onRemove(ticker)`. 행 본문 클릭 시 `/profile/[ticker]` 라우팅.
 *   - 거래정지/관리종목 경고 배지 — 기존 `badge-critical`/`badge-warn` 토큰(신규 토큰 0, §9 q6).
 *
 * `fix/watchlist-partial-render` — 부분실패 종목 누락 방지(좌조인 렌더):
 *   - `quote` 가 없는(시세 실패/누락) ticker 는 "디그레이드 행" 으로 렌더한다. 종목명은 알 수
 *     없으니 ticker + 한글 안내 + 재시도 버튼(`onRetry`). 삭제 버튼은 정상 행과 동일 제공.
 *   - 디그레이드 행은 시세 미확정이므로 `/profile` 라우팅(행 클릭) 을 막는다.
 *   - 기존 행 구조/토큰 재사용(신규 토큰 0).
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
  WATCHLIST_ROW_FAILED,
  WATCHLIST_ROW_RETRY,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistRowProps {
  /** ticker — 좌조인 렌더의 기준 키. quote 없으면 디그레이드 행. */
  ticker: string;
  /** 매칭된 시세. undefined = 시세 실패/누락(디그레이드 행). */
  quote?: WatchlistQuote;
  onRemove: (ticker: string) => void;
  /** 디그레이드 행 재시도 — 전체 쿼리 refetch. */
  onRetry: () => void;
}

export function WatchlistRow({
  ticker,
  quote,
  onRemove,
  onRetry,
}: WatchlistRowProps) {
  const router = useRouter();

  if (!quote) {
    // 디그레이드 행 — 담은 종목은 사라지지 않는다. ticker + 안내 + 재시도 + 삭제.
    return (
      <div className="grid grid-cols-12 gap-md items-center p-md">
        <div className="col-span-7 flex flex-col gap-xs min-w-0">
          <span className="text-body-strong text-text-strong">{ticker}</span>
          <span className="text-caption text-text-muted">
            {WATCHLIST_ROW_FAILED}
          </span>
        </div>

        <div className="col-span-3 flex justify-end">
          <button
            type="button"
            className="button-secondary"
            onClick={onRetry}
          >
            {WATCHLIST_ROW_RETRY}
          </button>
        </div>

        <div className="col-span-2 flex justify-end">
          <button
            type="button"
            className="button-icon"
            aria-label={`${ticker} ${WATCHLIST_REMOVE_LABEL}`}
            onClick={() => onRemove(ticker)}
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

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
