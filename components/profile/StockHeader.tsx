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
 * 종목명 옆 관심종목 별 토글(`WatchlistStarButton` 재사용, #100 의 검색 결과 별과 동일 UX) — 상세를
 * 보면서 바로 관심목록 담기/빼기. `useWatchlistTickers`(localStorage SSOT)로 제어. StockPageLayout 의
 * 모바일/확대/기본 3분기는 상호배타 렌더라 인스턴스가 한 번에 하나만 마운트 → remount 시 store 재동기화.
 *
 * 'use client' — `useQueryStockPrice` + 관심 별 토글.
 */

"use client";

import { ArrowDownRight, ArrowUpRight, MinusIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { WatchlistStarButton } from "@/components/watchlist/WatchlistStarButton";
import { readRecentSearches } from "@/lib/utils/recentSearch";
import { pickStockName } from "@/lib/utils/resolveStockName";
import {
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
} from "@/lib/copy/profile/stockDetail";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

export interface StockHeaderProps {
  ticker: string;
  /** AI 종합분석 패널 열기. 공급자 선택은 패널 안 진입 화면(ProviderChooser)에서 한다. */
  onAIAnalysis?: () => void;
}

export function StockHeader({ ticker, onAIAnalysis }: StockHeaderProps) {
  const { data, isLoading, isError, error } = useQueryStockPrice(ticker);
  const { getName, hasTicker, addTicker, removeTicker } = useWatchlistTickers();

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
  // 관심종목 토글 — 추가 시 종목명을 함께 영구화(디그레이드 행 식별용). 이름 미해결(ticker 폴백)이면
  //   ticker 를 이름으로 저장하지 않도록 undefined 전달.
  const added = hasTicker(ticker);
  const nameForAdd = displayName === ticker ? undefined : displayName;
  const toggleWatch = () =>
    added ? removeTicker(ticker) : addTicker(ticker, nameForAdd);
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
      {/* 좌: 종목명 + 관심 별 토글 + AI 버튼 */}
      <div className="flex items-center gap-sm flex-wrap">
        <h1 className="text-h1 text-text-strong inline-flex items-center gap-sm">
          {displayName}
        </h1>
        <WatchlistStarButton added={added} onToggle={toggleWatch} />
        {onAIAnalysis && (
          <button
            type="button"
            onClick={onAIAnalysis}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-lg text-sm font-bold transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm cursor-pointer"
          >
            <Sparkles size={16} className="text-indigo-500" />
            {COPY.trigger}
          </button>
        )}
      </div>

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
