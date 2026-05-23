/**
 * HoldingsTop3 — `/dashboard` 보유 자산 Top 3 카드.
 *
 * PR7 (finsight-redesign) 신규.
 *
 * 시안 `Dashboard.tsx` L55~L88 정합 — 카드 헤더 (Activity 아이콘 + 타이틀 + "전체보기") + 3 항목.
 * 각 항목: 좌측 자산 원형 아이콘 (assetType 색) + 자산명 + symbol / 우측 KRW 평가 금액 + 등락률.
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰 (rounded.lg + card padding).
 *   - 자산 아이콘 = `bg-asset-stock` (주식) / `bg-asset-coin` (코인) — soft 페어 아닌 강조 색 위 surface.
 *   - 등락률 = `signal-up-text` / `signal-down-text` 합성 토큰 (한국식 — 상승 빨강 / 하락 파랑).
 *   - 헤더 좌측 아이콘 = `text-accent-vivid` (시안의 `text-blue-500` 정합 v8 토큰 cascade).
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import type { Holding } from "@/lib/types/dashboard/holdings";
import {
  HOLDINGS_SECTION_TITLE,
  HOLDINGS_VIEW_ALL,
} from "@/lib/copy/dashboard/labels";

export interface HoldingsTop3Props {
  holdings: Holding[];
}

export function HoldingsTop3({ holdings }: HoldingsTop3Props) {
  return (
    <section className="card" aria-label={HOLDINGS_SECTION_TITLE}>
      <header className="mb-lg flex items-center justify-between">
        <h2 className="inline-flex items-center gap-sm text-h2 text-text-strong">
          <Activity
            className="h-xl w-xl text-accent-vivid"
            aria-hidden="true"
          />
          {HOLDINGS_SECTION_TITLE}
        </h2>
        <button
          type="button"
          className="border-0 bg-transparent text-caption text-text-muted hover:text-text-strong"
        >
          {HOLDINGS_VIEW_ALL}
        </button>
      </header>
      <ul className="flex flex-col gap-md">
        {holdings.map((holding) => (
          <HoldingRow key={holding.symbol} holding={holding} />
        ))}
      </ul>
    </section>
  );
}

function HoldingRow({ holding }: { holding: Holding }) {
  const isStock = holding.assetType === "stock";
  // 자산 식별 색 — 강조 색 위 surface 텍스트 (소프트 페어 아님 — 시안의 bg-blue-500/bg-orange-500 정합).
  const iconBgClass = isStock ? "bg-asset-stock" : "bg-asset-coin";
  const signalClass = holding.isUp ? "signal-up-text" : "signal-down-text";

  return (
    <li className="flex items-center justify-between">
      <div className="flex items-center gap-md">
        <div
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-pill text-body-strong text-surface",
            iconBgClass,
          )}
          aria-hidden="true"
        >
          {holding.name.charAt(0)}
        </div>
        <div className="flex flex-col">
          <p className="text-body-sm-strong text-text-strong">
            {holding.name}
          </p>
          <p className="text-caption text-text-muted">{holding.symbol}</p>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <p className="text-body-sm-strong text-text-strong tabular-nums">
          ₩ {formatNumber(holding.amountKrw)}
        </p>
        <p className={cn("text-body-sm", signalClass)}>
          {formatPct(holding.changePct, { digits: 1, sign: true })}
        </p>
      </div>
    </li>
  );
}
