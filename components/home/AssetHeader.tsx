/**
 * AssetHeader — `/` (Home / AnalysisDashboard mock) 상단 자산 정보 헤더.
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `AnalysisDashboard.tsx` L52~L80 정합 — 자산 아이콘 + 자산명 + 페어 칩 + 즐겨찾기 +
 * 대형 가격 + 단위 + 등락률 / 등락 절대값.
 *
 * 책임:
 *   - 자산 이름 + 페어 표시 (asset-stock-soft / asset-coin-soft 토큰 cascade).
 *   - 대형 가격 (`text-font-display` 36px / 800w + tabular-nums + Pretendard).
 *   - 등락률 / 등락 절대값 (한국식 — `isUp` true=빨강/`signal-up`, false=파랑/`signal-down`).
 *   - 즐겨찾기 토글 — 클라이언트 상태(useState) 만 보유. 실제 BE 호출 0.
 *
 * 클라이언트/서버:
 *   - 즐겨찾기 토글이 useState 를 사용하므로 본 컴포넌트는 `'use client'`.
 *   - 가격·등락 값은 props 로 받음 (server → client 단방향).
 *
 * v8 토큰 활용:
 *   - `bg-asset-coin-soft text-asset-coin` (코인 자산) / `bg-asset-stock-soft text-asset-stock` (주식).
 *   - `signal-up-text` / `signal-down-text` 합성 토큰 — 등락 텍스트 색 + tabular-nums.
 *   - `text-font-display font-font-display` — 대형 가격 (Pretendard 800w 36px).
 *   - hex/px 직타 0건.
 */

"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import type { CurrentAsset } from "@/lib/types/home/currentAsset";
import { ASSET_FAVORITE_ARIA } from "@/lib/copy/home/labels";

export interface AssetHeaderProps {
  asset: CurrentAsset;
}

export function AssetHeader({ asset }: AssetHeaderProps) {
  // 즐겨찾기 토글 — 로컬 in-session 상태만. BE 호출 0 (PR6 mock 단계).
  const [isFavorite, setIsFavorite] = useState(false);

  const isCrypto = asset.assetType === "crypto";
  // 페어 칩 cascade — 자산 식별 토큰.
  const pairChipClass = isCrypto
    ? "bg-asset-coin-soft text-asset-coin"
    : "bg-asset-stock-soft text-asset-stock";

  // 자산 아이콘 원형 — 자산 식별 토큰 의 soft 배경.
  const iconWrapClass = isCrypto
    ? "bg-asset-coin-soft text-asset-coin"
    : "bg-asset-stock-soft text-asset-stock";

  // 한국식 등락 색 — isUp true = 빨강 (signal-up), false = 파랑 (signal-down).
  const signalTextClass = asset.isUp ? "signal-up-text" : "signal-down-text";
  const SignalIcon = asset.isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-sm">
          <div
            className={cn(
              "h-2xl w-2xl rounded-pill inline-flex items-center justify-center text-h2 font-bold",
              iconWrapClass,
            )}
            aria-hidden="true"
          >
            {isCrypto ? "₿" : asset.symbol.slice(0, 1)}
          </div>
          <h1 className="text-h1 text-text-strong inline-flex items-center gap-sm">
            {asset.name}
            <span
              className={cn(
                "text-badge px-sm py-[2px] rounded-sm font-normal",
                pairChipClass,
              )}
            >
              {asset.pair}
            </span>
          </h1>
          <button
            type="button"
            className={cn(
              "favorite-toggle",
              isFavorite && "favorite-toggle-active",
            )}
            aria-pressed={isFavorite}
            aria-label={ASSET_FAVORITE_ARIA}
            onClick={() => setIsFavorite((v) => !v)}
          >
            <Star
              className="h-xl w-xl"
              aria-hidden="true"
              fill={isFavorite ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="flex items-end gap-sm flex-wrap">
          <span className="text-font-display font-font-display text-text-strong tabular-nums tracking-tight">
            {formatNumber(asset.priceKrw)}
          </span>
          <span className="text-body-md text-text-muted mb-[2px]">
            {asset.unit}
          </span>
          <div
            className={cn(
              "inline-flex items-center gap-xs text-body-strong mb-[2px]",
              signalTextClass,
            )}
          >
            <SignalIcon className="h-xl w-xl" aria-hidden="true" />
            <span>{formatPct(asset.changePct, { digits: 1, sign: true })}</span>
            <span className="text-caption text-text-muted font-normal ml-xs">
              ({asset.isUp ? "+" : ""}
              {formatNumber(asset.changeKrw)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
