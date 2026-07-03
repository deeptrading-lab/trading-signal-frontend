/**
 * IndicesCardContainer — 주요 지수 카드의 client 데이터 경계.
 *
 * PRD `market-real-data` §3.5 — page(server) 는 mock 직접 import 를 끊고, 본 컨테이너가
 * `useQueryIndices(DEFAULT_INDEX_CODES)` 로 KIS 실데이터(국내 3종)를 가져와
 * 로딩 / 에러 / 빈 / (부분)성공 분기를 처리한 뒤 표시 모델로 변환해 `IndicesCard` 에 넘긴다.
 *
 * `variant`(home-reskin) — 데이터·상태 분기는 공유하고 표현만 분기:
 *   - `"card"`(기본): `/market` 2-col 카드(회귀 0).
 *   - `"strip"`: 홈 카드리스 스트립 — 로딩/에러/빈 상태도 카드 셸 없이 플랫.
 *
 * 커스텀훅 의무화 (frontend.md §1) — `useQuery` 직접 import 금지. 도메인 훅 `useQueryIndices` 만 소비.
 *
 * 부분 성공: BFF 가 `Promise.allSettled` 로 성공분만 반환 → data.length 가 codes 보다 짧을 수 있다.
 */

"use client";

import { TrendingUp } from "lucide-react";
import { IndicesCard, type IndicesCardVariant } from "./IndicesCard";
import { useQueryIndices } from "@/hooks/market/useQueryIndices";
import { DEFAULT_INDEX_CODES } from "@/lib/api/market/indices";
import type { MarketIndexQuote } from "@/lib/api/kis/types";
import type { MarketIndex } from "@/lib/types/market/indices";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  MARKET_INDICES_EMPTY,
  MARKET_INDICES_ERROR,
  MARKET_INDICES_LOADING,
  MARKET_INDICES_RETRY,
  MARKET_INDICES_TITLE,
} from "@/lib/copy/market/labels";

export interface IndicesCardContainerProps {
  /** 조회할 지수 코드 — 기본 국내 3종(KOSPI/KOSDAQ/KOSPI200). */
  codes?: readonly string[];
  /** 표현 variant — 기본 `card`(/market). 홈은 `strip`. */
  variant?: IndicesCardVariant;
}

/** 데이터 모델(BFF 응답) → 표시 모델(IndicesCard) 변환. */
function toMarketIndex(quote: MarketIndexQuote): MarketIndex {
  return {
    name: quote.name,
    value: formatNumber(quote.value),
    changeDisplay: formatPct(quote.changePercent, { sign: true }),
    isUp: quote.direction === "up",
  };
}

export function IndicesCardContainer({
  codes = DEFAULT_INDEX_CODES,
  variant = "card",
}: IndicesCardContainerProps) {
  const { data, isLoading, isError, refetch } = useQueryIndices(codes);
  const isStrip = variant === "strip";

  if (isLoading) {
    return (
      <IndicesCardShell isStrip={isStrip}>
        {isStrip ? (
          <IndicesStripSkeleton />
        ) : (
          <div className="skeleton min-h-[120px]" aria-busy="true">
            <span className="sr-only">{MARKET_INDICES_LOADING}</span>
            <div className="skeleton-line skeleton-line-medium" />
            <div className="skeleton-line skeleton-line-narrow" />
            <div className="skeleton-line skeleton-line-medium" />
          </div>
        )}
      </IndicesCardShell>
    );
  }

  if (isError) {
    return (
      <IndicesCardShell isStrip={isStrip}>
        {isStrip ? (
          <div className="flex flex-col items-start gap-md py-md" role="alert">
            <p className="text-body-sm text-text-muted">
              {MARKET_INDICES_ERROR}
            </p>
            <button
              type="button"
              className="button-secondary"
              onClick={() => refetch()}
            >
              {MARKET_INDICES_RETRY}
            </button>
          </div>
        ) : (
          <div className="card-critical" role="alert">
            <p className="text-body-strong mb-md">{MARKET_INDICES_ERROR}</p>
            <button
              type="button"
              className="button-secondary"
              onClick={() => refetch()}
            >
              {MARKET_INDICES_RETRY}
            </button>
          </div>
        )}
      </IndicesCardShell>
    );
  }

  if (!data || data.length === 0) {
    return (
      <IndicesCardShell isStrip={isStrip}>
        <p className="text-body-md text-text-muted">{MARKET_INDICES_EMPTY}</p>
      </IndicesCardShell>
    );
  }

  return <IndicesCard indices={data.map(toMarketIndex)} variant={variant} />;
}

/**
 * 로딩/에러/빈 상태 셸 — card variant 는 카드 헤더/셸을 IndicesCard 와 동일하게 유지.
 * strip variant 는 헤더 없이 플랫(스트립은 섹션 제목이 없다 — 노스스타 정합).
 */
function IndicesCardShell({
  isStrip,
  children,
}: {
  isStrip: boolean;
  children: React.ReactNode;
}) {
  if (isStrip) {
    return <div aria-label={MARKET_INDICES_TITLE}>{children}</div>;
  }
  return (
    <section className="card" aria-label={MARKET_INDICES_TITLE}>
      <header className="mb-lg flex items-center gap-sm">
        <TrendingUp className="h-xl w-xl text-accent-vivid" aria-hidden="true" />
        <h2 className="text-h2 text-text-strong">{MARKET_INDICES_TITLE}</h2>
      </header>
      {children}
    </section>
  );
}

/** 스트립 로딩 — 보더리스 타일 4개 스켈레톤(하단 헤어라인 유지). */
function IndicesStripSkeleton() {
  return (
    <div
      className="flex border-b border-border-line pb-lg"
      aria-busy="true"
      aria-label={MARKET_INDICES_LOADING}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex w-32 shrink-0 flex-col gap-xs border-r border-border-line px-lg first:pl-0 last:border-r-0"
        >
          <Skeleton variant="line" className="mb-0 h-3 w-12" />
          <Skeleton variant="line" className="mb-0 h-5 w-20" />
          <Skeleton variant="line" className="mb-0 h-3 w-14" />
        </div>
      ))}
    </div>
  );
}
