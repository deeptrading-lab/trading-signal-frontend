/**
 * IndicesCard — 주요 지수 표시(2 variant).
 *
 * - `variant="card"`(기본): `/market` 2-col grid 카드(기존 그대로 — 회귀 0).
 * - `variant="strip"`(home-reskin): 카드리스 가로 스트립. 노스스타 `#homeScreen .idx` 정합 —
 *   **박스 없는** 보더리스 타일 [지수명(caption)] / [값(h2, tnum)] / [등락률(부호색)],
 *   타일 사이 세로 헤어라인 + 스트립 하단 헤어라인으로만 구분. 모바일 가로 스크롤.
 *
 * ⚠️ 스트립 스파크라인 미포함 — `MarketIndexQuote` 는 단일 스냅샷(값/등락/방향)만 담고 시계열이
 *   없다. 시세 계층 무변경 리스킨 범위에서 가짜 시리즈를 그리지 않는다(금융 데이터 정직성).
 *
 * 정적 server-safe 컴포넌트 — useState 0. 색은 부호(한국식 상승 빨강/하락 파랑).
 */

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MarketIndex } from "@/lib/types/market/indices";
import { MARKET_INDICES_TITLE } from "@/lib/copy/market/labels";

export type IndicesCardVariant = "card" | "strip";

export interface IndicesCardProps {
  indices: MarketIndex[];
  variant?: IndicesCardVariant;
}

export function IndicesCard({ indices, variant = "card" }: IndicesCardProps) {
  if (variant === "strip") {
    return (
      <ul
        className="flex overflow-x-auto border-b border-border-line pb-lg scrollbar-hide-mobile"
        aria-label={MARKET_INDICES_TITLE}
      >
        {indices.map((index, i) => (
          <IndexTile key={index.name} index={index} first={i === 0} />
        ))}
      </ul>
    );
  }

  return (
    <section className="card" aria-label={MARKET_INDICES_TITLE}>
      <header className="mb-lg flex items-center gap-sm">
        <TrendingUp className="h-xl w-xl text-accent-vivid" aria-hidden="true" />
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

/** 스트립 타일 — 보더리스 세로 스택(home-reskin). */
function IndexTile({ index, first }: { index: MarketIndex; first: boolean }) {
  const signalClass = index.isUp ? "signal-up-text" : "signal-down-text";
  return (
    <li
      className={cn(
        "flex w-32 shrink-0 flex-col gap-xs border-r border-border-line px-lg last:border-r-0",
        first && "pl-0",
      )}
    >
      <span className="truncate text-caption text-text-muted">{index.name}</span>
      <span className="text-h2 tabular-nums text-text-strong">
        {index.value}
      </span>
      <span className={cn("text-caption", signalClass)}>
        {index.changeDisplay}
      </span>
    </li>
  );
}

/** 카드 셀 — 기존 `/market` 2-col grid(회귀 0). */
function IndexCell({ index }: { index: MarketIndex }) {
  const signalClass = index.isUp ? "signal-up-text" : "signal-down-text";
  const Icon = index.isUp ? TrendingUp : TrendingDown;
  return (
    <li className="rounded-md bg-surface-muted p-md">
      <p className="mb-xs text-body-sm text-text-strong">{index.name}</p>
      <div className="flex items-baseline justify-between gap-sm">
        <span className="text-h2 text-text-strong tabular-nums">
          {index.value}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-xs text-body-sm whitespace-nowrap",
            signalClass,
          )}
        >
          <Icon className="h-md w-md" aria-hidden="true" />
          {index.changeDisplay}
        </span>
      </div>
    </li>
  );
}
