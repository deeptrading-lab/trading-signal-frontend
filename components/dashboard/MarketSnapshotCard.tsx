/**
 * MarketSnapshotCard — 공포·탐욕 게이지 + 상승/하락 종목 수.
 *
 * PR7 (finsight-redesign) 신규.
 * home-market-redesign PR2 — fng-* 토큰 적용:
 *   - 그라데이션 트랙: `from-red-500 via-yellow-500 to-emerald-500` → `from-fng-extreme-fear via-fng-neutral to-fng-extreme-greed`
 *   - 트랙 배경: `bg-border-line` → `bg-fng-track`
 *   - 구간 라벨: 값에 따른 `fng-band-*` 배지 (5구간 의미축)
 *   - 게이지 점수: `text-gauge-score` (40px/800)
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils/formatMoney";
import type { FearGreed, FearGreedLabel } from "@/lib/types/dashboard/fearGreed";
import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";
import {
  MARKET_TODAY_TITLE,
  FEAR_GREED_TITLE,
  FEAR_GREED_EXTREME_FEAR,
  FEAR_GREED_FEAR,
  FEAR_GREED_NEUTRAL,
  FEAR_GREED_GREED,
  FEAR_GREED_EXTREME_GREED,
  MARKET_SNAPSHOT_UP,
  MARKET_SNAPSHOT_DOWN,
} from "@/lib/copy/dashboard/labels";

const FEAR_GREED_LABEL_MAP: Record<FearGreedLabel, string> = {
  EXTREME_FEAR: FEAR_GREED_EXTREME_FEAR,
  FEAR: FEAR_GREED_FEAR,
  NEUTRAL: FEAR_GREED_NEUTRAL,
  GREED: FEAR_GREED_GREED,
  EXTREME_GREED: FEAR_GREED_EXTREME_GREED,
};

/** 구간 값에 따른 fng-band-* CSS 클래스 반환. */
function getFngBandClass(label: FearGreedLabel): string {
  const map: Record<FearGreedLabel, string> = {
    EXTREME_FEAR: "fng-band-extreme-fear",
    FEAR: "fng-band-fear",
    NEUTRAL: "fng-band-neutral",
    GREED: "fng-band-greed",
    EXTREME_GREED: "fng-band-extreme-greed",
  };
  return map[label];
}

/** 구간 값에 따른 fng-* 텍스트 색상 클래스 반환 (게이지 점수 숫자). */
function getFngScoreColorClass(label: FearGreedLabel): string {
  const map: Record<FearGreedLabel, string> = {
    EXTREME_FEAR: "text-fng-extreme-fear",
    FEAR: "text-fng-fear",
    NEUTRAL: "text-fng-neutral",
    GREED: "text-fng-greed",
    EXTREME_GREED: "text-fng-extreme-greed",
  };
  return map[label];
}

export interface MarketSnapshotCardProps {
  fearGreed: FearGreed;
  snapshot: MarketSnapshot;
}

export function MarketSnapshotCard({
  fearGreed,
  snapshot,
}: MarketSnapshotCardProps) {
  const bandClass = getFngBandClass(fearGreed.label);
  const scoreColorClass = getFngScoreColorClass(fearGreed.label);

  return (
    <section className="card" aria-label={MARKET_TODAY_TITLE}>
      <header className="mb-lg flex items-center justify-between">
        <h2 className="inline-flex items-center gap-sm text-h2 text-text-strong">
          <TrendingUp
            className="h-xl w-xl text-accent-vivid"
            aria-hidden="true"
          />
          {MARKET_TODAY_TITLE}
        </h2>
      </header>

      <div className="flex flex-col gap-lg">
        {/* Fear & Greed Index — fng-* 의미축 토큰 적용.
         *  home-market-redesign PR2: 별도 의미축(DESIGN.md §Colors — 한국 등락색 충돌 해소).
         *  트랙: from-fng-extreme-fear via-fng-neutral to-fng-extreme-greed (파랑→회색→와인).
         *  점수: gauge-score(40px/800) + 구간별 fng-* 색.
         *  라벨: fng-band-* 배지 (5구간 WCAG AA 통과). */}
        <div className="rounded-md bg-surface-muted p-lg">
          <div className="mb-sm flex items-center justify-between">
            <span className="text-body-sm-strong text-text-strong">
              {FEAR_GREED_TITLE}
            </span>
            <span className={bandClass}>
              {FEAR_GREED_LABEL_MAP[fearGreed.label]}
            </span>
          </div>
          {/* 게이지 점수 (40px/800 — 색이 보조축이므로 숫자가 의미의 정본) */}
          <div className="mb-md flex items-end gap-md">
            <span
              className={`text-gauge-score tabular-nums ${scoreColorClass}`}
              aria-label={`게이지 점수 ${fearGreed.value}`}
            >
              {fearGreed.value}
            </span>
            <span className="text-caption text-text-muted pb-xs">/ 100</span>
          </div>
          {/* 그라데이션 게이지 트랙 — fng-* 의미축 (파랑→회색→와인). */}
          <div className="h-[8px] w-full overflow-hidden rounded-pill bg-fng-track">
            <div
              className="h-full bg-gradient-to-r from-fng-extreme-fear via-fng-neutral to-fng-extreme-greed"
              style={{ width: `${fearGreed.value}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* 상승/하락 종목 수 — 한국식 cascade. */}
        <div className="flex gap-md">
          <div className="flex-1 rounded-md border border-border-line p-md">
            <p className="mb-xs text-caption text-text-muted">
              {MARKET_SNAPSHOT_UP}
            </p>
            <p className="text-h1 text-signal-up tabular-nums">
              {formatNumber(snapshot.up)}
            </p>
          </div>
          <div className="flex-1 rounded-md border border-border-line p-md">
            <p className="mb-xs text-caption text-text-muted">
              {MARKET_SNAPSHOT_DOWN}
            </p>
            <p className="text-h1 text-signal-down tabular-nums">
              {formatNumber(snapshot.down)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
