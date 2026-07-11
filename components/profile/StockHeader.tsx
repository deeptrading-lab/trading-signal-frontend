/**
 * StockHeader — `/stock/[ticker]` 토스톤 가격 헤더(T4 "항시", 카드리스).
 *
 * stock-detail-reskin — 노스스타 `.phead` 정합:
 *   ① 이름행: 로고닷 + 종목명(**코드 미표시**) + 관심 별 + 매수 유의 경고칩 · (우) AI 종합분석 버튼.
 *   ② 가격행: 큰 현재가(font-display) + 등락률/등락액(한국식 상승 빨강·하락 파랑).
 *   ※ 업종 칩은 기업개황 '업종' 필드와 중복이라 제거(chart-minute-interval). 거래소·시총은 payload 부재로 미표시.
 *
 * 데이터: `useQueryStockPrice(ticker)` — KIS 현재가 + 등락 + 업종. 종목명은 watchlist store →
 *   최근 검색 → API → ticker 폴백 순. 경고칩은 `useQueryStockWarnings`(fail-soft: 없으면 미표시).
 *   관심 별은 `useWatchlistTickers`(localStorage SSOT).
 *
 * 'use client' — 쿼리 훅 + 관심 별 토글. 로딩/에러/빈 상태는 Skeleton·card-critical·card-info.
 */

"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { isUsTicker } from "@/lib/utils/isUsTicker";
import { formatPct } from "@/lib/utils/formatPct";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { useQueryStockWarnings } from "@/hooks/stock/useQueryStockWarnings";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { WatchlistStarButton } from "@/components/watchlist/WatchlistStarButton";
import { StockWarningBadges } from "@/components/stock/StockWarningBadges";
import { StockHeaderSkeleton } from "@/components/profile/StockHeaderSkeleton";
import { readRecentSearches } from "@/lib/utils/recentSearch";
import { pickStockName } from "@/lib/utils/resolveStockName";
import { rankLogoDotClass, rankLogoInitial } from "@/lib/utils/rankLogoDot";
import {
  STOCK_DETAIL_LOAD_ERROR,
  STOCK_DETAIL_NOT_FOUND,
} from "@/lib/copy/profile/stockDetail";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

export interface StockHeaderProps {
  ticker: string;
  /** AI 종합분석 패널 열기. 공급자 선택은 패널 진입 화면에서 한다. */
  onAIAnalysis?: () => void;
}

export function StockHeader({ ticker, onAIAnalysis }: StockHeaderProps) {
  const { data, isLoading, isError } = useQueryStockPrice(ticker);
  // 미국 종목은 달러 — 통화 라벨을 USD 로(us-stock-support).
  const isUs = isUsTicker(ticker);
  // 매수 유의 경고칩 — BFF fail-soft(실패도 200+빈 배열)라 data 만 보고 없으면 미표시.
  const { data: warningsData } = useQueryStockWarnings(ticker);
  const { getName, hasTicker, addTicker, removeTicker } = useWatchlistTickers();

  if (isLoading) {
    return <StockHeaderSkeleton />;
  }

  if (isError) {
    return (
      <div className="card-critical" role="alert">
        <p className="text-body-strong">{STOCK_DETAIL_LOAD_ERROR}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-info" role="status">
        <p className="text-body-strong">{STOCK_DETAIL_NOT_FOUND}</p>
      </div>
    );
  }

  // 이름 우선순위: watchlist store → 최근 검색 → API 응답 → ticker 폴백.
  const displayName =
    pickStockName(ticker, [
      getName(ticker),
      readRecentSearches().find((e) => e.ticker === ticker)?.name,
      data.name,
    ]) ?? ticker;
  const added = hasTicker(ticker);
  // 이름 미해결(ticker 폴백)이면 ticker 를 이름으로 저장하지 않도록 undefined.
  const nameForAdd = displayName === ticker ? undefined : displayName;
  const toggleWatch = () =>
    added ? removeTicker(ticker) : addTicker(ticker, nameForAdd);

  const isUp = data.direction === "up";
  const isFlat = data.direction === "flat";
  const signalTextClass = isFlat
    ? "text-text-muted"
    : isUp
      ? "signal-up-text"
      : "signal-down-text";
  const SignalIcon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col gap-md">
      {/* ① 이름행 */}
      <div className="flex flex-wrap items-center gap-sm">
        <span
          className={cn(
            "inline-grid h-7 w-7 shrink-0 place-items-center rounded-sm text-caption font-bold",
            rankLogoDotClass(ticker),
          )}
          aria-hidden="true"
        >
          {rankLogoInitial(displayName)}
        </span>
        <h1 className="text-h1 text-text-strong">{displayName}</h1>
        <WatchlistStarButton added={added} onToggle={toggleWatch} />
        <StockWarningBadges warnings={warningsData?.warnings} />
        {onAIAnalysis && (
          <button
            type="button"
            onClick={onAIAnalysis}
            className="ml-auto inline-flex shrink-0 items-center gap-xs rounded-pill bg-gradient-ai-soft px-md py-xs text-button-sm text-gradient-ai-from transition-[filter] duration-base hover:brightness-105"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {COPY.trigger}
          </button>
        )}
      </div>

      {/* ② 가격행 */}
      <div className="flex flex-wrap items-end gap-sm">
        <span className="text-font-display font-font-display tabular-nums tracking-tight text-text-strong">
          {formatNumber(data.price)}
        </span>
        <span className="pb-1 text-caption text-text-muted">{isUs ? "USD" : "KRW"}</span>
        <div
          className={cn(
            "inline-flex items-center gap-xs pb-1 text-body-strong",
            signalTextClass,
          )}
        >
          <SignalIcon className="h-4 w-4" aria-hidden="true" />
          <span>{formatPct(data.changePercent, { digits: 2, sign: true })}</span>
          <span className="text-caption font-normal text-text-muted">
            ({data.change > 0 ? "+" : ""}
            {formatNumber(data.change)})
          </span>
        </div>
      </div>
    </div>
  );
}
