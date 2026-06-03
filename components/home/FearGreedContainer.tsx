/**
 * FearGreedContainer — 공포·탐욕(국내+미국) + 상승/하락 컨테이너.
 *
 * PRD `fear-greed-overhaul`. 두 출처:
 *   - **국내(코스피)**: `useQueryIndices(DEFAULT_INDEX_CODES)` 의 KOSPI(0001) advances/declines +
 *     changePercent 로 `computeDomesticFearGreed`(breadth 60% + 모멘텀 40%) 합성. 지수카드와
 *     동일 queryKey → React Query dedup(추가 KIS 호출 0).
 *   - **미국(CNN)**: `useQueryFearGreed`(BFF `/api/market/fear-greed` → CNN 실값). 차단 시 unavailable.
 *
 * 상승/하락 종목 수도 동일 KOSPI 쿼리에서. 로딩/누락 시 기본값(중립 50 / 0종목) fallback.
 *
 * 컨벤션(`docs/rules/frontend.md` §1): useQuery 직접 import 금지 → 도메인 훅만 소비.
 */

"use client";

import { useQueryIndices } from "@/hooks/market/useQueryIndices";
import { useQueryFearGreed } from "@/hooks/market/useQueryFearGreed";
import { DEFAULT_INDEX_CODES } from "@/lib/api/market/indices";
import { MarketSnapshotCard } from "@/components/dashboard/MarketSnapshotCard";
import { computeDomesticFearGreed } from "@/lib/utils/fearGreed";
import type { FearGreed } from "@/lib/types/dashboard/fearGreed";
import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";

const NEUTRAL_FEAR_GREED: FearGreed = { value: 50, label: "NEUTRAL" };
const DEFAULT_SNAPSHOT: MarketSnapshot = { up: 0, down: 0 };

export function FearGreedContainer() {
  // 지수카드와 동일 codes/queryKey → React Query dedup (홈에서 /api/market/indices 1콜).
  const { data, isLoading: indicesLoading } = useQueryIndices(DEFAULT_INDEX_CODES);
  // 미국 CNN — 별도 BFF 쿼리(저빈도). 차단/실패 시 live=false → unavailable.
  const { data: cnn, isLoading: cnnLoading } = useQueryFearGreed();

  // 공유 쿼리에서 KOSPI 를 code 기준으로 명시 선택(순서 비의존).
  const kospi = data?.find((quote) => quote.code === "0001");
  const advances = kospi?.advances ?? 0;
  const declines = kospi?.declines ?? 0;
  const total = advances + declines;

  const domesticFearGreed =
    total > 0
      ? computeDomesticFearGreed({
          advances,
          declines,
          changePercent: kospi?.changePercent ?? 0,
        })
      : NEUTRAL_FEAR_GREED;

  const snapshot: MarketSnapshot =
    total > 0 ? { up: advances, down: declines } : DEFAULT_SNAPSHOT;

  return (
    <MarketSnapshotCard
      domestic={{ fearGreed: domesticFearGreed, isLoading: indicesLoading }}
      us={{
        fearGreed: cnn ?? NEUTRAL_FEAR_GREED,
        isLoading: cnnLoading,
        unavailable: !cnnLoading && (!cnn || !cnn.live),
      }}
      snapshot={snapshot}
    />
  );
}
