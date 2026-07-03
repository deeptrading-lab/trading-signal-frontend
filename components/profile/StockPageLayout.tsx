/**
 * StockPageLayout — `/stock/[ticker]` 카드리스·T4 티어링 본문(stock-detail-reskin).
 *
 * 노스스타 `#detailScreen` 정합 — **단일 컬럼 카드리스**(데스크탑·모바일 공통). 카드 박스 대신
 * 헤어라인·여백으로 섹션을 구분(토스 톤). 정보 티어링(T4):
 *   - 항시(always): 시세 헤더 → 일봉 차트 → 컴팩트 시그널 요약. 화면에 늘 떠 있다.
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
import type { ChartPeriod } from "@/hooks/stock/useQueryStockChart";
import { StockHeader } from "./StockHeader";
import { StockDailyChart } from "./StockDailyChart";
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
  DEFAULT_PERIOD,
  defaultDaysForPeriod,
  type ChartType,
} from "./stockChartConfig";

export function StockPageLayout({ ticker }: { ticker: string }) {
  const { openFor } = useAIAnalysisContext();
  const openAIAnalysis = () => openFor(ticker);

  // 차트 컨트롤 상태 — 부모가 소유해 StockDailyChart 를 controlled 로 두고 값(라인/캔들·봉·기간)을 보존.
  const [period, setPeriod] = useState<ChartPeriod>(DEFAULT_PERIOD);
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [chartType, setChartType] = useState<ChartType>(DEFAULT_CHART_TYPE);
  // 오버레이 옵션(매물대·볼린저밴드) — 기본 off, 드롭다운 체크박스로 토글. localStorage 지속.
  const { options: chartOptions, toggle: toggleChartOption } = useChartOptions();

  function handlePeriodChange(p: ChartPeriod) {
    setPeriod(p);
    setDays(defaultDaysForPeriod(p)); // 봉 변경 시 해당 봉의 첫 범위로
  }

  const chartControls = {
    period,
    days,
    chartType,
    showVolumeProfile: chartOptions.volumeProfile,
    showBollinger: chartOptions.bollinger,
    onPeriodChange: handlePeriodChange,
    onDaysChange: setDays,
    onChartTypeChange: setChartType,
    onToggleVolumeProfile: () => toggleChartOption("volumeProfile"),
    onToggleBollinger: () => toggleChartOption("bollinger"),
  };

  return (
    <div className="flex flex-col">
      {/* ── 항시(T4): 시세 헤더 ── */}
      <StockHeader ticker={ticker} onAIAnalysis={openAIAnalysis} />

      {/* ── 항시: 일봉 차트(플랫) — 시맨틱 <section> 은 자식(ChartShell)이 소유, 래퍼는 헤어라인만 ── */}
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
