/**
 * FearGreedContainer — 공포·탐욕 게이지 컨테이너.
 *
 * home-market-redesign PR2 신규.
 *
 * 데이터 소스:
 *   - `useQueryIndices(['0001'])` (KOSPI) — advances/declines 필드로 breadth 산출.
 *   - breadth 공식: `total = advances + declines; value = total > 0 ? Math.round(100 * advances / total) : 50`
 *   - label 매핑: 0-24→EXTREME_FEAR, 25-44→FEAR, 45-55→NEUTRAL, 56-75→GREED, 76-100→EXTREME_GREED
 *
 * 로딩: skeleton / 에러·데이터 없음: 기본값(value=50, label=NEUTRAL) 으로 fallback.
 *
 * 컨벤션 (`docs/rules/frontend.md` §1):
 *   - useQuery 직접 import 금지 → `useQueryIndices` 도메인 훅만 소비.
 */

"use client";

import { useQueryIndices } from "@/hooks/market/useQueryIndices";
import { MarketSnapshotCard } from "@/components/dashboard/MarketSnapshotCard";
import type { FearGreed, FearGreedLabel } from "@/lib/types/dashboard/fearGreed";
import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";

const KOSPI_CODE = ["0001"] as const;

/** 0~100 값 → FearGreedLabel 매핑. */
function toFearGreedLabel(value: number): FearGreedLabel {
  if (value <= 24) return "EXTREME_FEAR";
  if (value <= 44) return "FEAR";
  if (value <= 55) return "NEUTRAL";
  if (value <= 75) return "GREED";
  return "EXTREME_GREED";
}

const DEFAULT_SNAPSHOT: MarketSnapshot = { up: 0, down: 0 };

export function FearGreedContainer() {
  const { data, isLoading } = useQueryIndices(KOSPI_CODE);

  if (isLoading) {
    return (
      <div className="skeleton min-h-[180px]" aria-busy="true">
        <span className="sr-only">공포·탐욕 지표 로딩 중</span>
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line skeleton-line-narrow" />
        <div className="skeleton-line skeleton-line-medium" />
      </div>
    );
  }

  const kospi = data?.[0];
  const advances = kospi?.advances ?? 0;
  const declines = kospi?.declines ?? 0;
  const total = advances + declines;
  const value = total > 0 ? Math.round((100 * advances) / total) : 50;
  const label = toFearGreedLabel(value);

  const fearGreed: FearGreed = { value, label };
  const snapshot: MarketSnapshot = {
    up: advances,
    down: declines,
  };

  const resolvedSnapshot: MarketSnapshot =
    total > 0 ? snapshot : DEFAULT_SNAPSHOT;

  return (
    <MarketSnapshotCard
      fearGreed={fearGreed}
      snapshot={resolvedSnapshot}
    />
  );
}
