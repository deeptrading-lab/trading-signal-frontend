/**
 * IndicesCard — `/market` 주요 지수 카드.
 *
 * PR8 (finsight-redesign) 신규.
 *
 * 시안 `MarketTrends.tsx` L42~L67 정합 — 카드 헤더 (TrendingUp 아이콘 + 타이틀) + 6 지수 2-col grid.
 * 각 항목: 지수명 (text-caption) + 값 (text-h2 tabular-nums) + 변동률 (한국식 + TrendingUp/Down 아이콘).
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰 (rounded.lg + card padding).
 *   - 헤더 좌측 아이콘 = `text-accent-vivid` (시안의 `text-emerald-500` 정합 v8 토큰 cascade).
 *   - 지수 박스 = `bg-surface-muted rounded-md p-md` (시안 `bg-slate-50` 정합).
 *   - 변동률 = `signal-up-text` / `signal-down-text` (한국식 — 상승 빨강 / 하락 파랑).
 *   - 변동률 아이콘 = `TrendingUp` (상승) / `TrendingDown` (하락). 색은 signal-up/-down 텍스트 cascade 자연 흡수.
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MarketIndex } from "@/lib/types/market/indices";
import { MARKET_INDICES_TITLE } from "@/lib/copy/market/labels";

export interface IndicesCardProps {
  indices: MarketIndex[];
}

export function IndicesCard({ indices }: IndicesCardProps) {
  return (
    <section className="card" aria-label={MARKET_INDICES_TITLE}>
      <header className="mb-lg flex items-center gap-sm">
        <TrendingUp
          className="h-xl w-xl text-accent-vivid"
          aria-hidden="true"
        />
        <h2 className="text-h2 text-text-strong">{MARKET_INDICES_TITLE}</h2>
      </header>
      <ul className="grid grid-cols-2 gap-md">
        {indices.map((index) => (
          <IndexCell key={index.name} index={index} />
        ))}
      </ul>
    </section>
  );
}

function IndexCell({ index }: { index: MarketIndex }) {
  const signalClass = index.isUp ? "signal-up-text" : "signal-down-text";
  const Icon = index.isUp ? TrendingUp : TrendingDown;
  return (
    <li className="rounded-md bg-surface-muted p-md">
      <p className="mb-xs text-caption text-text-muted">{index.name}</p>
      <p className="mb-xs text-h2 text-text-strong tabular-nums">
        {index.value}
      </p>
      <div className={cn("inline-flex items-center gap-xs text-body-sm", signalClass)}>
        <Icon className="h-md w-md" aria-hidden="true" />
        {index.changeDisplay}
      </div>
    </li>
  );
}
