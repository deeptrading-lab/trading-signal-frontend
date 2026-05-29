/**
 * IndicesCardContainer — `/market` 주요 지수 카드의 client 데이터 경계.
 *
 * PRD `market-real-data` §3.5 — page(server) 는 mock 직접 import 를 끊고, 본 컨테이너가
 * `useQueryIndices(DEFAULT_INDEX_CODES)` 로 KIS 실데이터(국내 3종)를 가져와
 * 로딩 / 에러 / 빈 / (부분)성공 분기를 처리한 뒤 표시 모델로 변환해 `IndicesCard` 에 넘긴다.
 *
 * 책임 경계:
 *   - 데이터 fetch + 상태 분기 + `MarketIndexQuote` → `MarketIndex`(표시 모델) 변환 = 본 컨테이너.
 *   - 카드 셸/그리드/셀 렌더 = `IndicesCard`(server-safe presentational).
 *
 * 커스텀훅 의무화 (frontend.md §1) — `useQuery` 직접 import 금지. 도메인 훅 `useQueryIndices` 만 소비.
 *
 * 부분 성공: BFF 가 `Promise.allSettled` 로 성공분만 반환 → data.length 가 codes 보다 짧을 수 있다.
 * 받은 것만 렌더 (셀 grid 가 1~3칸으로 자연 축소).
 *
 * 표시 변환:
 *   - value(number) → `formatNumber`(천단위 콤마, 소수 2자리 보존).
 *   - changePercent(number) → `formatPct({ sign: true })`(부호 + %).
 *   - isUp = direction === "up" (flat 은 하락 톤으로 흡수 — 기존 셀 2색 체계 유지, 신규 토큰 0).
 */

"use client";

import { TrendingUp } from "lucide-react";
import { IndicesCard } from "./IndicesCard";
import { useQueryIndices } from "@/hooks/market/useQueryIndices";
import { DEFAULT_INDEX_CODES } from "@/lib/api/market/indices";
import type { MarketIndexQuote } from "@/lib/api/kis/types";
import type { MarketIndex } from "@/lib/types/market/indices";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
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
}: IndicesCardContainerProps) {
  const { data, isLoading, isError, refetch } = useQueryIndices(codes);

  if (isLoading) {
    return (
      <IndicesCardShell>
        <div className="skeleton min-h-[120px]" aria-busy="true">
          <span className="sr-only">{MARKET_INDICES_LOADING}</span>
          <div className="skeleton-line skeleton-line-medium" />
          <div className="skeleton-line skeleton-line-narrow" />
          <div className="skeleton-line skeleton-line-medium" />
        </div>
      </IndicesCardShell>
    );
  }

  if (isError) {
    return (
      <IndicesCardShell>
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
      </IndicesCardShell>
    );
  }

  if (!data || data.length === 0) {
    return (
      <IndicesCardShell>
        <p className="text-body-md text-text-muted">{MARKET_INDICES_EMPTY}</p>
      </IndicesCardShell>
    );
  }

  return <IndicesCard indices={data.map(toMarketIndex)} />;
}

/** 로딩/에러/빈 상태에서 카드 헤더·셸을 IndicesCard 와 동일하게 유지. */
function IndicesCardShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="card" aria-label={MARKET_INDICES_TITLE}>
      <header className="mb-lg flex items-center gap-sm">
        <TrendingUp
          className="h-xl w-xl text-accent-vivid"
          aria-hidden="true"
        />
        <h2 className="text-h2 text-text-strong">{MARKET_INDICES_TITLE}</h2>
      </header>
      {children}
    </section>
  );
}
