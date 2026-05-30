/**
 * FearGreedContainer — 공포·탐욕 게이지 컨테이너.
 *
 * home-market-redesign PR2 신규.
 *
 * 데이터 소스:
 *   - `useQueryIndices(DEFAULT_INDEX_CODES)` (지수카드 `IndicesCardContainer` 와 동일 쿼리) —
 *     KOSPI(0001) 의 advances/declines 필드로 breadth 산출.
 *   - queryKey 가 지수카드와 동일하므로 홈 마운트 시 React Query 가 단일 fetch 로 dedup한다
 *     (PRD `market-indices-consolidation` §3.1 — 코스피 단독 1콜 제거). 잉여 필드(코스닥/코스피200)는
 *     수신하되 사용하지 않는다(추가 KIS 호출 0).
 *   - breadth 공식: `total = advances + declines; value = total > 0 ? Math.round(100 * advances / total) : 50`
 *   - label 매핑: 0-24→EXTREME_FEAR, 25-44→FEAR, 45-55→NEUTRAL, 56-75→GREED, 76-100→EXTREME_GREED
 *
 * KOSPI 선택: 공유 쿼리에서는 순서가 0001 보장이 약하므로 `data?.find(q => q.code === '0001')`
 * 로 code 기준 명시적 선택(컨테이너 내부, PRD §3.1 / §9 q5 RESOLVED — 훅 selector 미추가).
 *
 * 로딩: skeleton / 에러·데이터 없음·KOSPI 누락: 기본값(value=50, label=NEUTRAL) 으로 fallback.
 *
 * 컨벤션 (`docs/rules/frontend.md` §1):
 *   - useQuery 직접 import 금지 → `useQueryIndices` 도메인 훅만 소비.
 */

"use client";

import { useQueryIndices } from "@/hooks/market/useQueryIndices";
import { DEFAULT_INDEX_CODES } from "@/lib/api/market/indices";
import { MarketSnapshotCard } from "@/components/dashboard/MarketSnapshotCard";
import type { FearGreed, FearGreedLabel } from "@/lib/types/dashboard/fearGreed";
import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";

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
  // 지수카드와 동일 codes/queryKey → React Query dedup (홈에서 /api/market/indices 1콜).
  const { data, isLoading } = useQueryIndices(DEFAULT_INDEX_CODES);

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

  // 공유 쿼리에서 KOSPI 를 code 기준으로 명시 선택(순서 비의존). 누락 시 기본값 fallback.
  const kospi = data?.find((quote) => quote.code === "0001");
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
