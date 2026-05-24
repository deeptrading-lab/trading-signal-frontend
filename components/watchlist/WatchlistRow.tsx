/**
 * WatchlistRow — `/watchlist` 테이블 1 row (server component).
 *
 * PR9 (finsight-redesign) 신규.
 *
 * 시안 `Watchlist.tsx` L36~L70 정합 — 12-col grid row.
 * 각 row 구성:
 *   - col-span-5 md:4 = 자산 type 칩 + 종목명/심볼
 *   - col-span-4 md:3 = 현재가 (tabular-nums, 우측 정렬)
 *   - col-span-3 md:3 = 등락률 칩 (badge-signal-up / badge-signal-down, 우측 정렬)
 *   - hidden md:flex col-span-2 = 관리 버튼 (MoreVertical, 우측 정렬)
 *
 * v8 토큰:
 *   - 자산 type 칩 = `badge-asset-stock` / `badge-asset-coin` (한국식 자산 식별)
 *   - 등락 칩 = `badge-signal-up` / `badge-signal-down` (한국식 — 상승 빨강 / 하락 파랑)
 *   - row hover = `hover:bg-surface-muted`
 *   - 관리 버튼 = `button-icon` 합성 토큰
 *   - 자산 type 칩 hidden sm: → sm 이상 표시 (모바일 정보 밀도 절약)
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { WatchlistItem } from "@/lib/types/watchlist/items";
import { ASSET_TYPE_STOCK, ASSET_TYPE_CRYPTO } from "@/lib/copy/watchlist/labels";

export interface WatchlistRowProps {
  item: WatchlistItem;
}

export function WatchlistRow({ item }: WatchlistRowProps) {
  const assetBadgeClass =
    item.assetType === "stock" ? "badge-asset-stock" : "badge-asset-coin";
  const assetLabel =
    item.assetType === "stock" ? ASSET_TYPE_STOCK : ASSET_TYPE_CRYPTO;
  const signalBadgeClass = item.isUp ? "badge-signal-up" : "badge-signal-down";

  return (
    <div className="grid grid-cols-12 gap-md items-center p-md transition-colors hover:bg-surface-muted cursor-pointer">
      <div className="col-span-5 md:col-span-4 flex items-center gap-sm">
        <span className={cn("hidden sm:inline-flex", assetBadgeClass)}>
          {assetLabel}
        </span>
        <div>
          <div className="text-body-strong text-text-strong">{item.name}</div>
          <div className="text-caption text-text-muted">{item.symbol}</div>
        </div>
      </div>

      <div className="col-span-4 md:col-span-3 text-right text-body-strong text-text-strong tabular-nums">
        {item.priceDisplay}
      </div>

      <div className="col-span-3 md:col-span-3 flex justify-end">
        <span className={cn("tabular-nums", signalBadgeClass)}>
          {item.changeDisplay}
        </span>
      </div>

      <div className="hidden md:flex col-span-2 justify-end">
        <button
          type="button"
          className="button-icon"
          aria-label="관리"
        >
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
