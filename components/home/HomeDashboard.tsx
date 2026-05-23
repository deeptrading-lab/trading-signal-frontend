/**
 * HomeDashboard — `/` (Home / AnalysisDashboard mock) 의 client 셸 컴포저.
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 책임:
 *   - 검색 토글 (`SearchToggle`) + 검색바 (`SearchBar`) 상태 보유.
 *   - 타임프레임 칩 (`TimeframeChips`) 활성 상태 보유.
 *   - 9 컴포넌트를 lg:grid-cols-3 그리드로 조합.
 *
 * mock 데이터는 server (`app/(main)/page.tsx`) 가 import → props 로 내려보냄.
 * 본 컴포넌트는 `'use client'` — useState 보유.
 *
 * 책임 분리 사유:
 *   - server component (page.tsx) 가 useState 를 못 가지므로, 상호작용 상태는 본 셸이 보유.
 *   - 그러나 mock import 는 server side 에서 처리 → SSR 안전 (recharts·인터랙티브 컴포넌트만
 *     client 분리, AssetHeader / AiAnalysisCard / MarketStatsCard / TechnicalIndicatorsCard /
 *     NewsCard 는 props-only 정적 렌더).
 *
 * 그리드 레이아웃:
 *   - 모바일 (default): grid-cols-1 — 모든 카드 stacking.
 *   - 데스크탑 (lg+): grid-cols-3, 차트+AI 가 lg:col-span-2, 통계+지표+뉴스가 우측 1 컬럼.
 */

"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { SearchToggle } from "./SearchToggle";
import { SearchBar } from "./SearchBar";
import { AssetHeader } from "./AssetHeader";
import { TimeframeChips } from "./TimeframeChips";
import { PriceChart } from "./PriceChart";
import { AiAnalysisCard } from "./AiAnalysisCard";
import { MarketStatsCard } from "./MarketStatsCard";
import { TechnicalIndicatorsCard } from "./TechnicalIndicatorsCard";
import { NewsCard } from "./NewsCard";
import type { CurrentAsset } from "@/lib/types/home/currentAsset";
import type { PriceSeries } from "@/lib/types/home/priceChart";
import type { AiAnalysis } from "@/lib/types/home/aiAnalysis";
import type { MarketStats } from "@/lib/types/home/marketStats";
import type { TechnicalIndicator } from "@/lib/types/home/technicalIndicators";
import type { NewsList } from "@/lib/types/home/news";
import type {
  Timeframe,
  TimeframeOption,
} from "@/lib/types/home/timeframes";
import type { SearchAssetType } from "@/lib/types/home/searchOptions";
import { PRICE_CHART_TITLE } from "@/lib/copy/home/labels";

export interface HomeDashboardProps {
  currentAsset: CurrentAsset;
  priceSeries: PriceSeries;
  aiAnalysis: AiAnalysis;
  marketStats: MarketStats;
  technicalIndicators: TechnicalIndicator[];
  news: NewsList;
  timeframes: TimeframeOption[];
}

export function HomeDashboard({
  currentAsset,
  priceSeries,
  aiAnalysis,
  marketStats,
  technicalIndicators,
  news,
  timeframes,
}: HomeDashboardProps) {
  // 검색 토글 — 현재 자산의 종류로 초기화 (mock 정합).
  const [searchType, setSearchType] = useState<SearchAssetType>(
    currentAsset.assetType,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  // 타임프레임 — 기본 1M (시안 정합).
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");

  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      {/* 검색 영역 — 토글 + 검색바. */}
      <div className="card flex flex-col md:flex-row gap-sm items-center">
        <SearchToggle value={searchType} onChange={setSearchType} />
        <SearchBar
          assetType={searchType}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* 자산 헤더 + 타임프레임 칩 — 같은 행. */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-md mt-md">
        <AssetHeader asset={currentAsset} />
        <TimeframeChips
          options={timeframes}
          value={timeframe}
          onChange={setTimeframe}
        />
      </div>

      {/* 메인 그리드 — 차트+AI 좌측 (lg:col-span-2), 통계+지표+뉴스 우측. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* 좌측 컬럼 (lg:col-span-2) — 가격 차트 + AI 분석. */}
        <div className="lg:col-span-2 flex flex-col gap-lg min-w-0">
          <section className="card" aria-label={PRICE_CHART_TITLE}>
            <header className="flex justify-between items-center mb-md">
              <h2 className="text-h2 text-text-strong">{PRICE_CHART_TITLE}</h2>
              <button
                type="button"
                className="button-icon"
                aria-label="차트 옵션"
              >
                <MoreHorizontal className="h-xl w-xl" aria-hidden="true" />
              </button>
            </header>
            <PriceChart data={priceSeries} />
          </section>

          <AiAnalysisCard analysis={aiAnalysis} />
        </div>

        {/* 우측 컬럼 — 시장 정보 + 기술적 지표 + 뉴스. */}
        <div className="flex flex-col gap-lg min-w-0">
          <MarketStatsCard stats={marketStats} />
          <TechnicalIndicatorsCard indicators={technicalIndicators} />
          <NewsCard news={news} />
        </div>
      </div>
    </div>
  );
}
