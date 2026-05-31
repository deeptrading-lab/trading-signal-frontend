"use client";

import { useRef, useState } from "react";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { StockHeader } from "./StockHeader";
import { StockDailyChart } from "./StockDailyChart";
import { CompanyOverview } from "./CompanyOverview";
import { DisclosureList } from "./DisclosureList";

export function StockPageLayout({ ticker }: { ticker: string }) {
  const { isMobile } = useBreakpoint();
  const [chartExpanded, setChartExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <StockDailyChart ticker={ticker} />
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
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <CompanyOverview ticker={ticker} />
            <DisclosureList ticker={ticker} count={5} />
          </div>
        </div>
      ) : (
        /* 기본: 데스크탑 2-col (좌=기업정보, 우=차트) / 모바일 1-col 스택 */
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-lg items-start">
          <div className="flex flex-col gap-lg">
            <StockHeader ticker={ticker} />
            <CompanyOverview ticker={ticker} />
            <DisclosureList ticker={ticker} count={5} />
          </div>
          <div className="lg:sticky lg:top-4">
            <StockDailyChart
              ticker={ticker}
              onExpand={() => transition(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
