/**
 * MarketStatsCard — 시장 정보 그리드 (6 항목).
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `StatsGrid.tsx` 정합 — 2-col 그리드, 항목 별 라벨 + Info 아이콘 (tooltip) + 큰 값.
 * 6 항목: 시가총액 / 24시간 거래대금 / 유통량 / 52주 최고가 / 52주 최저가 / 도미넌스.
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰 (rounded.lg + card padding).
 *   - 값 텍스트 = `tabular-nums` + `text-body-strong`.
 *
 * tooltip 은 본 PR6 단계에서 native `title` 속성으로 단순화. shadcn Popover 등 도입은
 * 후속 PRD (§6.2 제약 — shadcn 풀세트 비도입).
 */

import { Info } from "lucide-react";
import type {
  MarketStat,
  MarketStatKey,
  MarketStats,
} from "@/lib/types/home/marketStats";
import {
  MARKET_STATS_TITLE,
  MARKET_STAT_CIRCULATING_SUPPLY,
  MARKET_STAT_DOMINANCE,
  MARKET_STAT_HIGH_52W,
  MARKET_STAT_LOW_52W,
  MARKET_STAT_MARKET_CAP,
  MARKET_STAT_VOLUME_24H,
} from "@/lib/copy/home/labels";
import {
  TOOLTIP_CIRCULATING_SUPPLY,
  TOOLTIP_DOMINANCE,
  TOOLTIP_HIGH_52W,
  TOOLTIP_LOW_52W,
  TOOLTIP_MARKET_CAP,
  TOOLTIP_VOLUME_24H,
} from "@/lib/copy/home/tooltips";

// mock 의 MarketStatKey → (라벨 / tooltip) 매핑.
const STAT_LABEL: Record<MarketStatKey, string> = {
  MARKET_CAP: MARKET_STAT_MARKET_CAP,
  VOLUME_24H: MARKET_STAT_VOLUME_24H,
  CIRCULATING_SUPPLY: MARKET_STAT_CIRCULATING_SUPPLY,
  HIGH_52W: MARKET_STAT_HIGH_52W,
  LOW_52W: MARKET_STAT_LOW_52W,
  DOMINANCE: MARKET_STAT_DOMINANCE,
};

const STAT_TOOLTIP: Record<MarketStatKey, string> = {
  MARKET_CAP: TOOLTIP_MARKET_CAP,
  VOLUME_24H: TOOLTIP_VOLUME_24H,
  CIRCULATING_SUPPLY: TOOLTIP_CIRCULATING_SUPPLY,
  HIGH_52W: TOOLTIP_HIGH_52W,
  LOW_52W: TOOLTIP_LOW_52W,
  DOMINANCE: TOOLTIP_DOMINANCE,
};

export interface MarketStatsCardProps {
  stats: MarketStats;
}

export function MarketStatsCard({ stats }: MarketStatsCardProps) {
  return (
    <section className="card" aria-label={MARKET_STATS_TITLE}>
      <h2 className="text-h2 text-text-strong mb-md">{MARKET_STATS_TITLE}</h2>
      <div className="grid grid-cols-2 gap-y-md gap-x-md">
        {stats.map((stat) => (
          <StatCell key={stat.key} stat={stat} />
        ))}
      </div>
    </section>
  );
}

function StatCell({ stat }: { stat: MarketStat }) {
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-center gap-xs text-text-muted">
        <span className="text-caption">{STAT_LABEL[stat.key]}</span>
        <span
          className="inline-flex cursor-help"
          title={STAT_TOOLTIP[stat.key]}
          aria-label={STAT_TOOLTIP[stat.key]}
        >
          <Info className="h-md w-md" aria-hidden="true" />
        </span>
      </div>
      <span className="text-body-sm-strong text-text-strong tabular-nums">
        {stat.value}
      </span>
    </div>
  );
}
