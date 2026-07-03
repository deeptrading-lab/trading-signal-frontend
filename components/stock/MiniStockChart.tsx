/**
 * MiniStockChart — 종목 일봉 미니 차트(어디서든 소환 가능한 포터블 차트, T3 인에이블러).
 *
 * `StockDailyChart` 의 가격 서브플롯만 떼어 낸 경량 버전 — 10개 컨트롤 prop·`ChartShell`·
 * 보조지표(MACD/RSI/거래량) 없이 캔들만. 데이터/테마/아톰은 상세 차트와 **동일 소스** 재사용:
 *   - `useChartData(ticker, "D", days)` → `useQueryStockChart` (쿼리키 공유 → 상세 진입 시 캐시 히트)
 *   - `useChartTheme` + `ChartThemeProvider` + `CandleBar`/`CandleTooltip` 아톰
 * 관심종목·랭킹·검색 등 종목 참조 지면의 hover/롱프레스 peek(Phase 2)가 소비한다.
 * `IntradayMiniChart`(분봉) 의 일봉 대응 — 같은 아톰·같은 렌더 경로.
 */

"use client";

import {
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartData } from "@/hooks/stock/useChartData";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import { ChartThemeProvider } from "@/components/profile/chart/ChartThemeContext";
import { CandleBar } from "@/components/profile/chart/CandleBar";
import { CandleTooltip } from "@/components/profile/chart/CandleTooltip";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/utils/formatMoney";

export interface MiniStockChartProps {
  ticker: string;
  /** 표시 구간(캘린더일). 기본 90(약 3개월). */
  days?: number;
  /** 차트 높이(px). peek 는 작게, 인라인 확장은 크게. 기본 120. */
  height?: number;
  /** 축·툴팁 노출. peek(간이)는 false, 확장 보기는 true. 기본 false. */
  showAxis?: boolean;
}

export function MiniStockChart({
  ticker,
  days = 90,
  height = 120,
  showAxis = false,
}: MiniStockChartProps) {
  const theme = useChartTheme();
  const { candleSeries, isLoading, isError } = useChartData(ticker, "D", days);

  if (isLoading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }
  if (isError || candleSeries.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-caption text-text-muted"
        style={{ height }}
      >
        차트를 불러오지 못했어요
      </div>
    );
  }

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ChartThemeProvider value={theme}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 240, height }}
        >
          <ComposedChart
            data={candleSeries}
            margin={{ top: 4, right: showAxis ? 8 : 2, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              hide={!showAxis}
              {...theme.axisProps}
              minTickGap={40}
              tickMargin={6}
            />
            <YAxis
              hide={!showAxis}
              {...theme.axisProps}
              width={showAxis ? 52 : 0}
              tickFormatter={(v: number) => formatMoney(v)}
              domain={["auto", "auto"]}
            />
            {showAxis && <Tooltip content={<CandleTooltip />} />}
            <Bar
              dataKey="wickRange"
              shape={<CandleBar />}
              maxBarSize={7}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartThemeProvider>
    </div>
  );
}
