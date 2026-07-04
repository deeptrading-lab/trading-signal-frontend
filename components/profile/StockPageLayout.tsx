/**
 * StockPageLayout — `/stock/[ticker]` 카드리스·T4 티어링 본문(stock-detail-reskin).
 *
 * 노스스타 `#detailScreen` 정합 — **단일 컬럼 카드리스**(데스크탑·모바일 공통). 카드 박스 대신
 * 헤어라인·여백으로 섹션을 구분(토스 톤). 정보 티어링(T4):
 *   - 항시(always): 시세 헤더 → 가격 차트(분/일/주/월봉) → 컴팩트 시그널 요약. 화면에 늘 떠 있다.
 *   - 온디맨드(잠깐): 회사개요·최근공시·투자자 수급 — **데스크탑·모바일 공통 기본 접힘**(CollapsibleCard
 *     `variant="flat"`). 접힘 상태에선 자식이 미마운트라 해당 API 도 펼치기 전까진 호출되지 않는다.
 *
 * 이전(카드 스택) 대비 변경:
 *   - 데스크탑 2-col grid + 차트 확대/축소 토글 제거 → 차트가 항상 콘텐츠 전폭이라 "확대"가 무의미해짐.
 *     차트 컨트롤 상태(봉/기간/차트타입/오버레이)는 그대로 부모가 소유(StockDailyChart controlled).
 *   - 반응형 분기(useBreakpoint)는 ChartShell 내부(기간 드롭다운)만 남기고, 레이아웃은 단일화.
 */

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StockHeader } from "./StockHeader";
import { StockChartSkeleton } from "./StockChartSkeleton";
import { SignalSummary } from "./SignalSummary";
import { CompanyOverview } from "./CompanyOverview";
import { DisclosureList } from "./DisclosureList";
import { StockInvestorTrend } from "./StockInvestorTrend";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import { useChartOptions } from "@/hooks/stock/useChartOptions";
import { STOCK_DETAIL_TIERING_NOTE } from "@/lib/copy/profile/stockDetail";
import {
  DEFAULT_CHART_TYPE,
  DEFAULT_DAYS,
  DEFAULT_INTERVAL,
  DEFAULT_TIMEFRAME,
  defaultDaysForPeriod,
  type ChartType,
  type MainInterval,
} from "./stockChartConfig";

/**
 * 가격 차트 — recharts(≈104kB gzip)를 끌어오므로 `next/dynamic({ssr:false})` 로 지연 로드
 * (stock-route-perf #3 · mobile-perf WS-4 완료). recharts 가 라우트 셸(첫 로드) 청크에서 빠져
 * 헤더·시그널이 먼저 페인트되고, 차트는 청크 로드 후 스트리밍된다. 컨트롤·동작은 로드 후 동일
 * (props 그대로 전달). loading 스켈레톤은 StockChartSkeleton — loading.tsx·내부 로딩과 높이 정합.
 */
const StockDailyChart = dynamic(
  () => import("./StockDailyChart").then((m) => m.StockDailyChart),
  { ssr: false, loading: () => <StockChartSkeleton /> },
);

export function StockPageLayout({ ticker }: { ticker: string }) {
  const { openFor } = useAIAnalysisContext();
  const openAIAnalysis = () => openFor(ticker);

  // 차트 컨트롤 상태 — 부모가 소유해 StockDailyChart 를 controlled 로 두고 값(라인/캔들·봉·기간/간격)을 보존.
  const [interval, setChartInterval] = useState<MainInterval>(DEFAULT_INTERVAL);
  const [days, setDays] = useState<number>(DEFAULT_DAYS); // 일/주/월봉 보기 범위
  const [timeframe, setTimeframe] = useState<number>(DEFAULT_TIMEFRAME); // 분봉 간격(분)
  const [chartType, setChartType] = useState<ChartType>(DEFAULT_CHART_TYPE);
  // 오버레이 옵션(이평선·매물대·볼린저·VWAP·거래량 이평) — 이평선만 기본 ON, 드롭다운 체크박스로 토글. localStorage 지속.
  const { options: chartOptions, toggle: toggleChartOption } = useChartOptions();

  function handleIntervalChange(next: MainInterval) {
    setChartInterval(next);
    // 분봉은 days 대신 timeframe(기본 5분)로 제어 — 범위 리셋 불필요. 일/주/월봉만 해당 봉 첫 범위로.
    if (next !== "m") setDays(defaultDaysForPeriod(next));
  }

  const chartControls = {
    interval,
    days,
    timeframe,
    chartType,
    overlays: chartOptions,
    onIntervalChange: handleIntervalChange,
    onDaysChange: setDays,
    onTimeframeChange: setTimeframe,
    onChartTypeChange: setChartType,
    onToggleOverlay: toggleChartOption,
  };

  return (
    <div className="flex flex-col">
      {/* ── 항시(T4): 시세 헤더 ── */}
      <StockHeader ticker={ticker} onAIAnalysis={openAIAnalysis} />

      {/* ── 항시: 가격 차트(플랫, 봉 단위 선택) — 시맨틱 <section> 은 자식(ChartShell)이 소유, 래퍼는 헤어라인만 ── */}
      <div className="mt-lg border-t border-border-line pt-lg">
        <StockDailyChart ticker={ticker} {...chartControls} />
      </div>

      {/* ── 항시: 컴팩트 시그널 요약(플랫) — 시맨틱 <section> 은 자식(SignalSummary)이 소유 ── */}
      <div className="mt-lg border-t border-border-line pt-lg">
        <SignalSummary ticker={ticker} />
      </div>

      {/* ── 온디맨드(T4): 회사개요·최근공시·수급 — 데스크탑·모바일 공통 기본 접힘 ── */}
      <div className="mt-lg border-t border-border-line">
        <CompanyOverview ticker={ticker} collapsible />
        <DisclosureList ticker={ticker} count={5} collapsible />
        <StockInvestorTrend ticker={ticker} collapsible />
      </div>

      {/* T4 안내 — 무엇이 항시이고 무엇이 펼침인지 */}
      <p className="mt-md text-caption text-text-muted">
        {STOCK_DETAIL_TIERING_NOTE}
      </p>
    </div>
  );
}
