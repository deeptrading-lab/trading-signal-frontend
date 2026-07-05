"use client";

import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useChartData } from "@/hooks/stock/useChartData";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import { ChartThemeProvider } from "@/components/profile/chart/ChartThemeContext";
import { CandleBar } from "@/components/profile/chart/CandleBar";
import { CandleTooltip } from "@/components/profile/chart/CandleTooltip";
import { SubLabel } from "@/components/profile/chart/SubLabel";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  fmtYAxis,
  fmtVolAxis,
  fmtTooltipVol,
  fmtTooltipMACD,
  fmtTooltipRSI,
} from "@/lib/utils/chartFormat";
import { MINI_CHART_DEFAULT_DAYS } from "@/components/stock/MiniStockChart";

/**
 * PeekChart — Peek 우측 도크용 **다중 패널 미리보기 차트**(컨트롤 없음).
 *
 * `StockDailyChart`(상세) 의 4패널을 컨트롤·카드셸·오버레이 토글 없이 압축한 읽기 전용 버전:
 *   ① 가격(캔들 + 이동평균선 MA 5/20/60/120) ② 거래량 ③ MACD(12/26/9) ④ RSI(14)
 * 데이터/색/아톰은 상세 차트와 **동일 소스** 재사용(`useChartData`·`useChartTheme`·CandleBar 등).
 * `MiniStockChart` 와 같은 `useChartData(ticker,"D",90)` 를 타 배경 선반입/hover 캐시(#253·#266)를
 * 그대로 히트한다(추가 페치 0). 도크가 인터랙티브(`pointer-events-auto`)라 각 패널 툴팁 hover 가능.
 *
 * MiniStockChart(가격 캔들만)의 도크 대체 — 사용자 요청("거래량·MACD·RSI·이평선도"). 팝오버/시트는
 * 좁아 MiniStockChart 유지, 넓은 도크만 이 차트를 쓴다.
 */

/** 도크 폭이 좁아 컴팩트 서브플롯 높이(px) — 상세(70/90/80)보다 축소. */
const VOL_H = 44;
const MACD_H = 54;
const RSI_H = 48;
/** 컴팩트 우측 축 폭(px) — 좁은 도크에 맞춤. */
const AXIS_W = 44;

export interface PeekChartProps {
  ticker: string;
  /** 가격 패널 높이(px) — 도크가 폭에 비례해 전달. 서브플롯은 그 아래 고정 높이로 누적. */
  priceHeight: number;
}

export function PeekChart({ ticker, priceHeight }: PeekChartProps) {
  const theme = useChartTheme();
  const { C, tooltipStyle, labelStyle, axisProps } = theme;
  const {
    isLoading,
    isError,
    candleSeries,
    volSeries,
    macdSeries,
    rsiSeries,
  } = useChartData(ticker, "D", MINI_CHART_DEFAULT_DAYS);

  const totalHeight = priceHeight + VOL_H + MACD_H + RSI_H + 48;
  if (isLoading) {
    return <Skeleton className="w-full" style={{ height: totalHeight }} />;
  }
  if (isError || candleSeries.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-caption text-text-muted"
        style={{ height: priceHeight }}
      >
        차트를 불러오지 못했어요
      </div>
    );
  }

  // 이동평균선 — 가격 캔들 위 topmost. 기본 ON(도크는 토글 없음). 얇게(1px) 그려 캔들을 안 가림.
  const maLines = (
    <>
      <Line type="monotone" dataKey="ma5" stroke={C.ma5} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
      <Line type="monotone" dataKey="ma20" stroke={C.ma20} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
      <Line type="monotone" dataKey="ma60" stroke={C.ma60} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
      <Line type="monotone" dataKey="ma120" stroke={C.ma120} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
    </>
  );

  const hasMacd = macdSeries.some((m) => m.macd !== null);
  const hasRsi = rsiSeries.some((r) => r.rsi !== null);

  return (
    <ChartThemeProvider value={theme}>
      {/* ① 가격 — 캔들 + 이동평균선 */}
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={priceHeight}>
          <ComposedChart data={candleSeries} syncId="peek-dock" margin={{ top: 4, right: 2, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
            <XAxis dataKey="date" {...axisProps} minTickGap={40} tickMargin={4} />
            <YAxis domain={["auto", "auto"]} {...axisProps} tickFormatter={fmtYAxis} width={AXIS_W} orientation="right" />
            <Tooltip content={<CandleTooltip showMA />} />
            <Bar dataKey="wickRange" shape={<CandleBar />} maxBarSize={8} isAnimationActive={false} />
            {maLines}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ② 거래량 */}
      <SubLabel label="거래량" />
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={VOL_H}>
          <ComposedChart data={volSeries} syncId="peek-dock" margin={{ top: 0, right: 2, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" {...axisProps} hide />
            <YAxis {...axisProps} tickFormatter={fmtVolAxis} width={AXIS_W} orientation="right" />
            <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipVol} labelStyle={labelStyle} />
            <Bar dataKey="volume" maxBarSize={5} isAnimationActive={false}>
              {volSeries.map((entry, i) => (
                <Cell key={i} fill={entry.isUp ? C.volUp : C.volDown} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ③ MACD */}
      {hasMacd && (
        <>
          <SubLabel label="MACD (12, 26, 9)" />
          <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={MACD_H}>
              <ComposedChart data={macdSeries} syncId="peek-dock" margin={{ top: 0, right: 2, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" {...axisProps} hide />
                <YAxis {...axisProps} tickFormatter={(v) => Number(v).toFixed(0)} width={AXIS_W} orientation="right" />
                <ReferenceLine y={0} stroke={C.refMid} strokeOpacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipMACD} labelStyle={labelStyle} />
                <Bar dataKey="histogram" maxBarSize={4} isAnimationActive={false}>
                  {macdSeries.map((entry, i) => (
                    <Cell key={i} fill={(entry.histogram ?? 0) >= 0 ? C.histUp : C.histDown} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="macd" stroke={C.macdLine} strokeWidth={1.25} dot={false} />
                {macdSeries.some((m) => m.signal !== null) && (
                  <Line type="monotone" dataKey="signal" stroke={C.signalLine} strokeWidth={1.25} dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ④ RSI */}
      {hasRsi && (
        <>
          <SubLabel label="RSI (14)" />
          <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={RSI_H}>
              <LineChart data={rsiSeries} syncId="peek-dock" margin={{ top: 0, right: 2, left: 0, bottom: 0 }}>
                <YAxis domain={[0, 100]} {...axisProps} ticks={[30, 70]} width={AXIS_W} orientation="right" />
                <ReferenceLine y={70} stroke={C.refOB} strokeDasharray="3 3" strokeOpacity={0.7} />
                <ReferenceLine y={30} stroke={C.refOS} strokeDasharray="3 3" strokeOpacity={0.7} />
                <ReferenceLine y={50} stroke={C.refMid} strokeOpacity={0.4} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipRSI} labelStyle={labelStyle} />
                <Line type="monotone" dataKey="rsi" stroke={C.rsiLine} strokeWidth={1.25} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartThemeProvider>
  );
}
