"use client";

import { useRef, useState } from "react";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import type { ChartPeriod } from "@/hooks/stock/useQueryStockChart";
import { StockHeader } from "./StockHeader";
import { StockDailyChart } from "./StockDailyChart";
import { CompanyOverview } from "./CompanyOverview";
import { DisclosureList } from "./DisclosureList";
import {
  DEFAULT_CHART_TYPE,
  DEFAULT_DAYS,
  DEFAULT_PERIOD,
  defaultDaysForPeriod,
  type ChartType,
} from "./stockChartConfig";

export function StockPageLayout({ ticker }: { ticker: string }) {
  const { isMobile } = useBreakpoint();
  const [chartExpanded, setChartExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 차트 컨트롤 상태 — 여기(부모)에서 소유한다. 데스크탑 확대/축소 토글 시 StockDailyChart 가
  //   서로 다른 트리 위치로 리마운트되어도 선택값(라인/캔들·봉·기간)이 보존된다.
  const [period, setPeriod] = useState<ChartPeriod>(DEFAULT_PERIOD);
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [chartType, setChartType] = useState<ChartType>(DEFAULT_CHART_TYPE);

  function handlePeriodChange(p: ChartPeriod) {
    setPeriod(p);
    setDays(defaultDaysForPeriod(p)); // 봉 변경 시 해당 봉의 첫 범위로
  }

  const chartControls = {
    period,
    days,
    chartType,
    onPeriodChange: handlePeriodChange,
    onDaysChange: setDays,
    onChartTypeChange: setChartType,
  };

  // 레이아웃 전환 시 fade-out → 상태 변경 → fade-in (데스크탑 확대/축소 한정)
  function transition(nextExpanded: boolean) {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setVisible(false);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setChartExpanded(nextExpanded);
      setVisible(true);
    }, 180);
  }

  // 모바일(`< md`): 순서 종목명·현재가 → 차트(축소 고정·확대 버튼 없음) → 기업개황 → 최근공시.
  //   기업개황·최근공시는 접기/펼치기 카드(기본 접힘). 차트 확대는 데스크탑 전용이라 onExpand 미전달.
  if (isMobile) {
    return (
      <div className="flex flex-col gap-lg">
        <StockHeader ticker={ticker} />
        <StockDailyChart ticker={ticker} {...chartControls} />
        <CompanyOverview ticker={ticker} collapsible />
        <DisclosureList ticker={ticker} count={5} collapsible />
      </div>
    );
  }

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 180ms ease",
      }}
    >
      {chartExpanded ? (
        /* 확대: 헤더 → 차트(풀너비) → 기업정보 */
        <div className="flex flex-col gap-lg">
          <StockHeader ticker={ticker} />
          <StockDailyChart
            ticker={ticker}
            expanded
            onCollapse={() => transition(false)}
            {...chartControls}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <CompanyOverview ticker={ticker} />
            <DisclosureList ticker={ticker} count={5} />
          </div>
        </div>
      ) : (
        /* 기본: 헤더(전폭) → 데스크탑 2-col (좌=기업정보, 우=차트) / 모바일 1-col 스택.
         *   헤더를 그리드 밖 전폭으로 올려 좌측 기업개황 카드와 우측 차트 카드의 시작 높이선을 맞춘다. */
        <div className="flex flex-col gap-lg">
          <StockHeader ticker={ticker} />
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-lg items-start">
            <div className="flex flex-col gap-lg">
              <CompanyOverview ticker={ticker} />
              <DisclosureList ticker={ticker} count={5} />
            </div>
            <div className="lg:sticky lg:top-4">
              <StockDailyChart
                ticker={ticker}
                onExpand={() => transition(true)}
                {...chartControls}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
