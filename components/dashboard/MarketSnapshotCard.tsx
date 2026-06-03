/**
 * MarketSnapshotCard — "오늘장 특징": 공포·탐욕 게이지(국내+미국) + 상승/하락 종목 수.
 *
 * PRD `fear-greed-overhaul` — 기존 단일 게이지(코스피 등락비율을 F&G로 오표기)를 두 출처로 분리:
 *   - 국내(코스피): breadth+모멘텀 자체 합성(베타).
 *   - 미국(CNN): CNN 실값 프록시(차단 시 unavailable).
 * 게이지 표현은 `FearGreedGauge` 공용 컴포넌트. 본 카드는 배치 + 상승/하락만.
 *
 * 표현 컴포넌트 — 데이터·로딩·unavailable 상태는 상위(FearGreedContainer)가 주입.
 */

import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils/formatMoney";
import { FearGreedGauge } from "@/components/dashboard/FearGreedGauge";
import type { FearGreed } from "@/lib/types/dashboard/fearGreed";
import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";
import {
  MARKET_TODAY_TITLE,
  FEAR_GREED_DOMESTIC_TITLE,
  FEAR_GREED_DOMESTIC_SOURCE,
  FEAR_GREED_US_TITLE,
  FEAR_GREED_US_SOURCE,
  MARKET_SNAPSHOT_UP,
  MARKET_SNAPSHOT_DOWN,
} from "@/lib/copy/dashboard/labels";

export interface MarketSnapshotCardProps {
  /** 국내(코스피) 합성 — 항상 값 존재(지수 로딩 중이면 isLoading). */
  domestic: { fearGreed: FearGreed; isLoading: boolean };
  /** 미국(CNN) — 차단/실패 시 unavailable. */
  us: { fearGreed: FearGreed; isLoading: boolean; unavailable: boolean };
  snapshot: MarketSnapshot;
}

export function MarketSnapshotCard({
  domestic,
  us,
  snapshot,
}: MarketSnapshotCardProps) {
  return (
    <section className="card" aria-label={MARKET_TODAY_TITLE}>
      <header className="mb-lg flex items-center justify-between">
        <h2 className="inline-flex items-center gap-sm text-h2 text-text-strong">
          <TrendingUp className="h-xl w-xl text-accent-vivid" aria-hidden="true" />
          {MARKET_TODAY_TITLE}
        </h2>
      </header>

      <div className="flex flex-col gap-lg">
        {/* 공포·탐욕 — 국내 / 미국 2개 게이지(모바일 스택 → lg 2열). */}
        <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
          <FearGreedGauge
            title={FEAR_GREED_DOMESTIC_TITLE}
            sourceLabel={FEAR_GREED_DOMESTIC_SOURCE}
            value={domestic.fearGreed.value}
            label={domestic.fearGreed.label}
            isLoading={domestic.isLoading}
          />
          <FearGreedGauge
            title={FEAR_GREED_US_TITLE}
            sourceLabel={FEAR_GREED_US_SOURCE}
            value={us.fearGreed.value}
            label={us.fearGreed.label}
            isLoading={us.isLoading}
            unavailable={us.unavailable}
          />
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
