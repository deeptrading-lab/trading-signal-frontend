/**
 * `/` — Home / AnalysisDashboard mock (PR6/9 finsight-redesign).
 *
 * PR6 (finsight-redesign) 신규 — PRD §3.3 / §5.6 AC-PAGE-1~8.
 *
 * 시안 `AnalysisDashboard.tsx` 의 정보 아키텍처를 본 저장소 컨벤션 (`docs/rules/frontend.md`)
 * 안에서 재구성. 9 컴포넌트 (`components/home/*`) 를 그리드로 조합.
 *
 * 구조 (위→아래):
 *   1. 검색 토글 (`SearchToggle`) + 검색바 (`SearchBar`) — 같은 행, 모바일 stacking.
 *   2. 자산 헤더 (`AssetHeader`) + 타임프레임 칩 (`TimeframeChips`) — 같은 행, 모바일 stacking.
 *   3. 메인 그리드 — `lg:grid-cols-3`:
 *      - 좌측 (lg:col-span-2): 가격 차트 (`PriceChart`) + AI 분석 (`AiAnalysisCard`).
 *      - 우측 1 컬럼: 시장 정보 (`MarketStatsCard`) + 기술적 지표 (`TechnicalIndicatorsCard`) +
 *        뉴스 (`NewsCard`).
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx = **server component** — mock 데이터 import + props 전달.
 *   - 인터랙티브 셸 (`HomeDashboard`) 가 `'use client'` — useState 보유 (검색 토글 / 검색어 /
 *     타임프레임).
 *   - 정적 표시 컴포넌트 (`AssetHeader` 제외 — 즐겨찾기 useState 보유) 는 `HomeDashboard` 가
 *     props 로 내려보내 SSR 무회귀.
 *
 * BFF 무관 — 본 화면은 PR6 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "홈" 메뉴 활성 — `isNavItemActive("/", "/")` true → `aria-current="page"`.
 */

import { HomeDashboard } from "@/components/home/HomeDashboard";
import { CURRENT_ASSET_MOCK } from "@/lib/mock/home/currentAsset";
import { PRICE_SERIES_MOCK } from "@/lib/mock/home/priceChart";
import { AI_ANALYSIS_MOCK } from "@/lib/mock/home/aiAnalysis";
import { MARKET_STATS_MOCK } from "@/lib/mock/home/marketStats";
import { TECHNICAL_INDICATORS_MOCK } from "@/lib/mock/home/technicalIndicators";
import { NEWS_MOCK } from "@/lib/mock/home/news";
import { TIMEFRAME_OPTIONS_MOCK } from "@/lib/mock/home/timeframes";

export default function HomePage() {
  return (
    <HomeDashboard
      currentAsset={CURRENT_ASSET_MOCK}
      priceSeries={PRICE_SERIES_MOCK}
      aiAnalysis={AI_ANALYSIS_MOCK}
      marketStats={MARKET_STATS_MOCK}
      technicalIndicators={TECHNICAL_INDICATORS_MOCK}
      news={NEWS_MOCK}
      timeframes={TIMEFRAME_OPTIONS_MOCK}
    />
  );
}
