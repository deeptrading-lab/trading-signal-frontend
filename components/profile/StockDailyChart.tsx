/**
 * StockDailyChart — 종목 상세 가격 차트 + 보조지표 서브플롯.
 *
 * 데이터 소스: `inquire-daily-itemchartprice`(FHKST03010100, 최대 100봉) — `useChartData`(워밍업 포함).
 *
 * 서브플롯 구성 (syncId="stock-chart" 로 호버 연동):
 *   1. 가격 (240px) — 캔들(기본) 또는 라인. 하단에 날짜축(일정 간격) 표시.
 *   2. 거래량 BarChart (70px) — `acml_vol` (추가 KIS 콜 0)
 *   3. MACD ComposedChart (90px) — 히스토그램(Bar) + MACD·시그널 라인(Line)
 *   4. RSI LineChart (80px) — 14기간 RSI + 과매수(70)/과매도(30) 기준선
 *
 * 책임 분리(Wave 3a):
 *   - 데이터 페치+지표 계산+슬라이스 → `@/hooks/stock/useChartData`
 *   - 카드 셸/컨트롤 → `./chart/ChartShell`, 보조지표 헤더 → `./chart/SubLabel`
 *   - 캔들 shape/툴팁 → `./chart/CandleBar`·`./chart/CandleTooltip`
 *   - 색·스타일(런타임 테마) → `@/hooks/utils/useChartTheme`(C/tooltip/axis, 다크 전환), 포맷터 → `@/lib/utils/chartFormat`
 *   본 파일은 위 조각을 조립해 서브플롯 레이아웃만 담당. 차트 컨트롤 상태는 상위 StockPageLayout 소유.
 */

"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { type ChartPeriod } from "@/hooks/stock/useQueryStockChart";
import { useChartData } from "@/hooks/stock/useChartData";
import {
  fmtYAxis,
  fmtVolAxis,
  fmtTooltipPrice,
  fmtTooltipVol,
  fmtTooltipMACD,
  fmtTooltipRSI,
} from "@/lib/utils/chartFormat";
import {
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
} from "@/lib/copy/profile/stockDetail";
import { PERIOD_UNIT, type ChartType } from "./stockChartConfig";
import { useChartTheme, SYNC_ID } from "@/hooks/utils/useChartTheme";
import { ChartThemeProvider } from "./chart/ChartThemeContext";
import { CandleBar } from "./chart/CandleBar";
import { CandleTooltip } from "./chart/CandleTooltip";
import { ChartShell } from "./chart/ChartShell";
import { SubLabel } from "./chart/SubLabel";

export interface StockDailyChartProps {
  ticker: string;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  // 차트 컨트롤 — 상위(StockPageLayout)가 소유. 확대/축소 리마운트에도 값 보존.
  period: ChartPeriod;
  days: number;
  chartType: ChartType;
  onPeriodChange: (p: ChartPeriod) => void;
  onDaysChange: (d: number) => void;
  onChartTypeChange: (t: ChartType) => void;
}

export function StockDailyChart({
  ticker,
  expanded,
  onExpand,
  onCollapse,
  period,
  days,
  chartType,
  onPeriodChange,
  onDaysChange,
  onChartTypeChange,
}: StockDailyChartProps) {
  const { isLoading, isError, error, priceSeries, candleSeries, volSeries, macdSeries, rsiSeries } =
    useChartData(ticker, period, days);

  // 런타임 테마 색 — light/dark 전환 시 새 객체 reference 로 recharts 리렌더.
  const theme = useChartTheme();
  const { C, tooltipStyle, labelStyle, axisProps } = theme;

  const shellProps = { expanded, onExpand, onCollapse, period, days, onPeriodChange, onDaysChange, chartType, onChartTypeChange };

  // 데이터 부족 안내의 봉 단위(일/주/월) — 선택된 봉 종류에 따라 표기 변경.
  const periodUnit = PERIOD_UNIT[period];

  if (isLoading) {
    return (
      <ChartShell {...shellProps}>
        <div className="flex items-center justify-center h-[480px] text-text-muted" aria-busy="true">
          {STOCK_DETAIL_LOADING}
        </div>
      </ChartShell>
    );
  }

  if (isError) {
    return (
      <ChartShell {...shellProps}>
        <div className="card-critical" role="alert">
          <p className="text-body-strong">{error?.message ?? STOCK_DETAIL_NOT_FOUND}</p>
        </div>
      </ChartShell>
    );
  }

  if (priceSeries.length === 0) {
    return (
      <ChartShell {...shellProps}>
        <p className="text-body-sm text-text-muted py-lg">차트 데이터가 없어요</p>
      </ChartShell>
    );
  }

  return (
    <ChartThemeProvider value={theme}>
    <ChartShell {...shellProps}>
      {/* ① 가격 — 라인 or 캔들 */}
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={240}>
          {chartType === "candle" ? (
            <ComposedChart data={candleSeries} syncId={SYNC_ID} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
              <XAxis dataKey="date" {...axisProps} dy={8} interval="preserveStartEnd" minTickGap={40} />
              <YAxis domain={["auto", "auto"]} {...axisProps} tickFormatter={fmtYAxis} width={56} orientation="right" />
              <Tooltip content={<CandleTooltip />} />
              <Bar dataKey="wickRange" shape={<CandleBar />} maxBarSize={12} isAnimationActive={false} />
            </ComposedChart>
          ) : (
            <AreaChart data={priceSeries} syncId={SYNC_ID} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sdcFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.fill} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
              <XAxis dataKey="date" {...axisProps} dy={8} interval="preserveStartEnd" minTickGap={40} />
              <YAxis domain={["auto", "auto"]} {...axisProps} tickFormatter={fmtYAxis} width={56} orientation="right" />
              <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipPrice} labelStyle={labelStyle} />
              <Area type="monotone" dataKey="price" stroke={C.stroke} strokeWidth={2} fillOpacity={1} fill="url(#sdcFill)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ② 거래량 */}
      <SubLabel label="거래량" />
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={70}>
          <BarChart data={volSeries} syncId={SYNC_ID} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
            <XAxis dataKey="date" {...axisProps} dy={6} hide />
            <YAxis {...axisProps} tickFormatter={fmtVolAxis} width={56} orientation="right" />
            <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipVol} labelStyle={labelStyle} />
            <Bar dataKey="volume" maxBarSize={6} isAnimationActive={false}>
              {volSeries.map((entry, i) => (
                <Cell key={i} fill={entry.isUp ? C.volUp : C.volDown} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ③ MACD — macd 라인은 26봉부터, signal은 35봉(26+9)부터 유효. 부족 시 안내 표시 */}
      {macdSeries.some((m) => m.macd !== null) ? (
        <>
          <SubLabel label="MACD (12, 26, 9)" />
          <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={90}>
              <ComposedChart data={macdSeries} syncId={SYNC_ID} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
                <XAxis dataKey="date" {...axisProps} hide />
                <YAxis {...axisProps} tickFormatter={(v) => Number(v).toFixed(0)} width={56} orientation="right" />
                <ReferenceLine y={0} stroke={C.refMid} strokeOpacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipMACD} labelStyle={labelStyle} />
                <Bar dataKey="histogram" maxBarSize={4} isAnimationActive={false}>
                  {macdSeries.map((entry, i) => (
                    <Cell key={i} fill={(entry.histogram ?? 0) >= 0 ? C.histUp : C.histDown} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="macd" stroke={C.macdLine} strokeWidth={1.5} dot={false} />
                {macdSeries.some((m) => m.signal !== null) && (
                  <Line type="monotone" dataKey="signal" stroke={C.signalLine} strokeWidth={1.5} dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <SubLabel label={`MACD — 데이터 부족 (최소 26${periodUnit})`} />
      )}

      {/* ④ RSI — 15봉(14+1) 이상이어야 유효. 부족 시 안내 표시 */}
      {rsiSeries.some((r) => r.rsi !== null) ? (
        <>
          <SubLabel label="RSI (14)" />
          <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={rsiSeries} syncId={SYNC_ID} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
                <XAxis dataKey="date" {...axisProps} dy={6} hide />
                <YAxis domain={[0, 100]} {...axisProps} ticks={[0, 30, 50, 70, 100]} width={56} orientation="right" />
                <ReferenceLine y={70} stroke={C.refOB} strokeDasharray="3 3" strokeOpacity={0.7} label={{ value: "70", position: "right", fill: C.refOB, fontSize: 10 }} />
                <ReferenceLine y={30} stroke={C.refOS} strokeDasharray="3 3" strokeOpacity={0.7} label={{ value: "30", position: "right", fill: C.refOS, fontSize: 10 }} />
                <ReferenceLine y={50} stroke={C.refMid} strokeOpacity={0.4} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipRSI} labelStyle={labelStyle} />
                <Line type="monotone" dataKey="rsi" stroke={C.rsiLine} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <SubLabel label={`RSI — 데이터 부족 (최소 15${periodUnit})`} />
      )}
    </ChartShell>
    </ChartThemeProvider>
  );
}
