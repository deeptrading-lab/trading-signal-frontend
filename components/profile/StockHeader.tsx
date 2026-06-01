/**
 * StockHeader — `/stock/[ticker]` 상단 종목 정보 헤더.
 *
 * PRD `stock-api-integration` (PR-B) §3.5 — Profile 도메인 종단 전환의 첫 영역.
 *
 * 책임:
 *   - `useQueryStockPrice(ticker)` 호출 — KIS 현재가 + 등락.
 *   - 종목명 (`hts_kor_isnm` 우선, `bstp_kor_isnm` 절대 미사용 — PR-A mappers 가 보장) + ticker
 *     + 대형 가격 + 등락률 / 등락 절대값.
 *   - 한국식 등락 컬러: red=상승 (`signal-up`), blue=하락 (`signal-down`).
 *   - 로딩 / 에러 / 빈 상태 카피 (§3.6).
 *
 * AssetHeader (`components/home/AssetHeader.tsx`) 와 시각 톤 정합. 본 컴포넌트는 별도 — Profile 도메인
 * (실데이터) + Home 도메인 (mock 시안) 의 책임 분리.
 *
 * 'use client' — `useQueryStockPrice` 호출 + 향후 즐겨찾기 토글 확장 여지.
 */

"use client";

import { ArrowDownRight, ArrowUpRight, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { readRecentSearches } from "@/lib/utils/recentSearch";
import { pickStockName } from "@/lib/utils/resolveStockName";
import {
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
} from "@/lib/copy/profile/stockDetail";

export interface StockHeaderProps {
  ticker: string;
}

export function StockHeader({ ticker }: StockHeaderProps) {
  const { data, isLoading, isError, error } = useQueryStockPrice(ticker);
  const { getName } = useWatchlistTickers();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-sm" aria-busy="true">
        <span className="text-h1 text-text-muted">{STOCK_DETAIL_LOADING}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-critical" role="alert">
        <p className="text-body-strong">
          {error?.message ?? STOCK_DETAIL_NOT_FOUND}
        </p>
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
  const direction = data.direction;
  const isUp = direction === "up";
  const isFlat = direction === "flat";
  const signalTextClass = isFlat
    ? "text-text-muted"
    : isUp
      ? "signal-up-text"
      : "signal-down-text";
  const SignalIcon = isFlat ? MinusIcon : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    // 모바일: 2줄 스택(이름 → 가격). 데스크탑(lg): 한 줄 — 좌측 이름·종목번호 / 우측 가격·등락.
    //   헤더를 한 줄로 압축해 좌측 기업개황 카드와 우측 차트 카드의 시작 높이선을 맞춘다.
    <div className="flex flex-col gap-sm lg:flex-row lg:items-center lg:justify-between lg:gap-md">
      {/* 좌: 종목명 + 종목번호 */}
      <h1 className="text-h1 text-text-strong inline-flex items-center gap-sm">
        {displayName}
        <span className="text-badge px-sm py-[2px] rounded-sm font-normal bg-asset-stock-soft text-asset-stock">
          {data.ticker}
        </span>
      </h1>

      {/* 우: 가격 + 단위 + 등락 */}
      <div className="flex items-end gap-sm flex-wrap lg:justify-end">
        <span className="text-font-display font-font-display text-text-strong tabular-nums tracking-tight">
          {formatNumber(data.price)}
        </span>
        <span className="text-body-md text-text-muted mb-[2px]">KRW</span>
        <div
          className={cn(
            "inline-flex items-center gap-xs text-body-strong mb-[2px]",
            signalTextClass,
          )}
        >
          <SignalIcon className="h-xl w-xl" aria-hidden="true" />
          <span>{formatPct(data.changePercent, { digits: 2, sign: true })}</span>
          <span className="text-caption text-text-muted font-normal ml-xs">
            ({data.change > 0 ? "+" : ""}
            {formatNumber(data.change)})
          </span>
        </div>
      </div>
    </div>
  );
}
