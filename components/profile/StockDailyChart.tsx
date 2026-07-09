/**
 * StockDailyChart — 종목 상세 가격 차트 + 보조지표 서브플롯.
 *
 * 데이터 소스(봉 단위별, `useChartData` 가 분기):
 *   - 일/주/월봉: `inquire-daily-itemchartprice`(FHKST03010100) — 워밍업 포함 fetch 후 구간 슬라이스.
 *   - 분봉(당일): `inquire-time-itemchartprice`(FHKST03010200) — 당일 한 세션 전체, x축 "HH:mm".
 *
 * 서브플롯 구성 (syncId="stock-chart" 로 호버 연동):
 *   1. 가격 (240px) — 캔들(기본) 또는 라인 + 이동평균선(MA 5/20/60/120, 기본 ON)·VWAP·볼린저·매물대 오버레이(옵션).
 *      MA 색 범례는 차트 상단 인라인 스트립 + 캔들 툴팁 MA 값으로 안내. 하단에 날짜축(일정 간격) 표시.
 *   2. 거래량 ComposedChart (70px) — `acml_vol` 봉 + 거래량 이동평균(VMA 20, 옵션 라인)
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

import { useMemo } from "react";
import {
  AreaChart,
  Area,
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
  ReferenceArea,
  ResponsiveContainer,
  Customized,
  DefaultZIndexes,
} from "recharts";
import type { ReactElement } from "react";
import { cn } from "@/lib/utils/cn";
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
import {
  PERIOD_UNIT,
  CHART_AXIS_WIDTH,
  CHART_MA_LABEL,
  MA_PERIODS,
  type ChartType,
  type MainInterval,
  type MaPeriod,
} from "./stockChartConfig";
import type { ChartOptions } from "@/lib/store/chart/chartOptions";
import type { AiVerdictLevels } from "@/lib/utils/aiVerdictLevels";
import { useChartTheme, SYNC_ID } from "@/hooks/utils/useChartTheme";
import { ChartThemeProvider } from "./chart/ChartThemeContext";
import { CandleBar } from "./chart/CandleBar";
import { CandleTooltip } from "./chart/CandleTooltip";
import { LastPriceTag } from "./chart/LastPriceTag";
import { makeAiAxisLabels } from "./chart/AiLevelAxisLabels";
import { PriceAxisTick } from "./chart/PriceAxisTick";
import { ChartShell } from "./chart/ChartShell";
import { SubLabel } from "./chart/SubLabel";
import { VolumeProfileLayer } from "./chart/VolumeProfileLayer";
import { computeVolumeProfile } from "@/lib/utils/volumeProfile";

/** 이평선 범례 점 색 — Tailwind chart-ma{p} 유틸(= var(--fs-*), 다크 자동 전환). 라인 색과 동일 토큰. */
const MA_DOT_CLASS: Record<MaPeriod, string> = {
  5: "bg-chart-ma5",
  20: "bg-chart-ma20",
  60: "bg-chart-ma60",
  120: "bg-chart-ma120",
};

/**
 * 이평선 범례 스트립 — "이평선  ─5 ─20 ─60 ─120" (─ 는 각 기간 고유색). showMA 일 때만 렌더.
 * 라벨 하나 + 색·숫자만으로 "MA5 MA20…" 보다 직관적(사용자 피드백).
 */
function MALegend() {
  return (
    <div className="mb-xs flex flex-wrap items-center gap-x-md gap-y-xs px-xs text-caption text-text-muted">
      <span className="font-medium text-text-strong">{CHART_MA_LABEL}</span>
      {MA_PERIODS.map((p) => (
        <span key={p} className="inline-flex items-center gap-xs">
          <span className={cn("h-0.5 w-3 rounded-pill", MA_DOT_CLASS[p])} aria-hidden="true" />
          {p}
        </span>
      ))}
    </div>
  );
}

export interface StockDailyChartProps {
  ticker: string;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  // 차트 컨트롤 — 상위(StockPageLayout)가 소유. 확대/축소 리마운트에도 값 보존.
  interval: MainInterval;
  days: number;
  timeframe: number;
  /** 분봉 기간(과거 거래일 수) — 0=당일, 5=1주, 20=1개월. 분봉 활성일 때만 의미. */
  minutePriorDays: number;
  chartType: ChartType;
  /** 오버레이 토글 묶음(이평선·매물대·볼린저·VWAP·거래량 이평) — 값 소유·localStorage 지속은 상위. */
  overlays: ChartOptions;
  onIntervalChange: (i: MainInterval) => void;
  onDaysChange: (d: number) => void;
  onTimeframeChange: (t: number) => void;
  onMinutePriorDaysChange: (d: number) => void;
  onChartTypeChange: (t: ChartType) => void;
  onToggleOverlay: (key: keyof ChartOptions) => void;
  /** AI 판정 가격 레벨(목표/재진입·손절) — 저장 판정에서 파생. null=미표시. */
  aiLevels?: AiVerdictLevels | null;
  /** AI 레벨 오버레이 표시 여부(배너 토글). aiLevels 있을 때만 유효. */
  showAiLevels?: boolean;
}

export function StockDailyChart({
  ticker,
  expanded,
  onExpand,
  onCollapse,
  interval,
  days,
  timeframe,
  minutePriorDays,
  chartType,
  overlays,
  onIntervalChange,
  onDaysChange,
  onTimeframeChange,
  onMinutePriorDaysChange,
  onChartTypeChange,
  onToggleOverlay,
  aiLevels,
  showAiLevels,
}: StockDailyChartProps) {
  const { isLoading, isError, error, priceSeries, candleSeries, volSeries, macdSeries, rsiSeries, xTicks } =
    useChartData(ticker, interval, days, timeframe, minutePriorDays);

  // 런타임 테마 색 — light/dark 전환 시 새 객체 reference 로 recharts 리렌더.
  const theme = useChartTheme();
  const { C, tooltipStyle, labelStyle, axisProps } = theme;

  // 오버레이 토글 — 렌더 분기용 로컬. 이평선(MA)만 기본 ON, 나머지 기본 OFF.
  const showMA = overlays.movingAverage;
  const showVWAP = overlays.vwap;
  const showVMA = overlays.volumeMA;
  const showVolumeProfile = overlays.volumeProfile;
  const showBollinger = overlays.bollinger;

  // 매물대 — 보이는 봉(candleSeries)의 high/low 범위에 거래량(volSeries) 분배. 캔들/라인 공통.
  //   index 정렬(둘 다 같은 보기 구간 슬라이스) → zip 안전. 토글 off 면 계산만 하고 렌더 생략.
  const volumeProfile = useMemo(
    () =>
      computeVolumeProfile(
        candleSeries.map((c, i) => ({
          low: c.low,
          high: c.high,
          volume: volSeries[i]?.volume ?? 0,
        })),
      ),
    [candleSeries, volSeries],
  );

  const shellProps = { expanded, onExpand, onCollapse, interval, days, timeframe, minutePriorDays, onIntervalChange, onDaysChange, onTimeframeChange, onMinutePriorDaysChange, chartType, onChartTypeChange, overlays, onToggleOverlay };

  // 멀티데이 분봉 x축 눈금(날짜 경계) 유무 — 있으면 그 눈금만(interval=0), 없으면 recharts 자동(양끝 보존).
  const xAxisInterval = xTicks ? 0 : "preserveStartEnd";

  // 볼린저밴드 표시 여부 — 토글 on 이고 보기 구간에 유효한(룩백 20봉 충족) 값이 있을 때만 렌더.
  const showBB = showBollinger && candleSeries.some((c) => c.bbMid != null);

  // MA·VWAP 오버레이 라인 — 캔들/라인 두 브랜치 공유(같은 dataKey, 두 시리즈 모두 필드 보유).
  //   가격 스케일 내 값이라 YAxis auto 도메인에 영향 없음. 얇게(1px) 그려 캔들을 가리지 않는다.
  //   recharts 는 children 을 React.Children.toArray 로 평탄화하므로 배열 보간이 안전(false 는 자동 제거).
  const priceOverlayLines = [
    showMA && (
      <Line key="ma5" type="monotone" dataKey="ma5" stroke={C.ma5} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
    ),
    showMA && (
      <Line key="ma20" type="monotone" dataKey="ma20" stroke={C.ma20} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
    ),
    showMA && (
      <Line key="ma60" type="monotone" dataKey="ma60" stroke={C.ma60} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
    ),
    showMA && (
      <Line key="ma120" type="monotone" dataKey="ma120" stroke={C.ma120} strokeWidth={1} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
    ),
    showVWAP && (
      <Line key="vwap" type="monotone" dataKey="vwap" stroke={C.vwap} strokeWidth={1.25} strokeDasharray="5 3" dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
    ),
  ];

  // 데이터 부족 안내의 봉 단위(분/일/주/월) — 선택된 봉 종류에 따라 표기 변경.
  const periodUnit = PERIOD_UNIT[interval];

  if (isLoading) {
    return (
      <ChartShell {...shellProps}>
        <div className="flex items-center justify-center h-[520px] text-text-muted" aria-busy="true">
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

  // 최신 종가 — 우측 y축에 현재가 태그로 표시. 색은 한국식(직전 봉 대비 상승 빨강/하락 파랑).
  const lastCandle = candleSeries.at(-1);
  const lastClose = lastCandle?.close ?? null;
  const lastUp = lastCandle
    ? lastCandle.change != null
      ? lastCandle.change >= 0
      : lastCandle.isUp
    : true;
  const lastPriceColor = lastUp ? C.stroke : C.down;

  // ── AI 판정 레벨 오버레이 — 저장 판정 있고 토글 ON 일 때만. 존(뒤, 채색)·선(앞)으로 분리.
  //    정확한 숫자 라벨은 차트 밖 배너 레전드에 두어(y축 태그 겹침 회피) 차트는 시각만 깔끔하게.
  //    ifOverflow="extendDomain" 로 목표/손절이 보이는 범위 밖이면 y도메인이 자동 확장된다.
  const ai = showAiLevels && aiLevels ? aiLevels : null;
  const aiZoneEls: ReactElement[] = [];
  const aiLineEls: ReactElement[] = [];
  if (ai) {
    // 존: 매수계열(target)=리워드(현재가↔목표)+리스크(손절↔현재가) · SELL=리스크만 · 재진입(관망)=존 없이 선만.
    if (ai.target?.role !== "reentry" && lastClose != null) {
      if (ai.target?.role === "target") {
        aiZoneEls.push(
          <ReferenceArea
            key="ai-reward"
            y1={Math.min(lastClose, ai.target.price)}
            y2={Math.max(lastClose, ai.target.price)}
            fill={C.stroke}
            fillOpacity={0.07}
            stroke="none"
            ifOverflow="extendDomain"
          />,
        );
      }
      aiZoneEls.push(
        <ReferenceArea
          key="ai-risk"
          y1={Math.min(lastClose, ai.stop.price)}
          y2={Math.max(lastClose, ai.stop.price)}
          fill={C.down}
          fillOpacity={0.07}
          stroke="none"
          ifOverflow="extendDomain"
        />,
      );
    }
    // 선(라벨 없음). 목표=상승색 / 재진입=중립 / 손절=하락색. 라벨(가격 알약)은 우측 축에 커스텀
    // 레이어(aiAxisLabelsEl)가 충돌 해소해 그린다.
    if (ai.target) {
      aiLineEls.push(
        <ReferenceLine
          key="ai-target"
          y={ai.target.price}
          stroke={ai.target.role === "target" ? C.stroke : C.refMid}
          strokeWidth={1.5}
          strokeDasharray="6 3"
          ifOverflow="extendDomain"
        />,
      );
    }
    aiLineEls.push(
      <ReferenceLine
        key="ai-stop"
        y={ai.stop.price}
        stroke={C.down}
        strokeWidth={1.5}
        strokeDasharray="6 3"
        ifOverflow="extendDomain"
      />,
    );
  }
  // 우측 가격 축 라벨(현재가 태그처럼) — 전 레벨 픽셀 y 를 모아 충돌 해소. Customized 로 y-스케일 확보.
  const aiAxisLabelsEl = ai ? (
    <Customized
      key="ai-axis-labels"
      component={makeAiAxisLabels(ai, lastClose, {
        target: C.stroke,
        reentry: C.refMid,
        stop: C.down,
        surface: C.surface,
      })}
    />
  ) : null;

  // 최신가 알약과 겹치는 가장 가까운 y축 눈금을 숨길 가격 임계값 — 보이는 가격 폭의 ~10%.
  // 기본 눈금 수(≈5개, 간격 ~20%)에서는 항상 최신가에 제일 가까운 눈금 하나만 숨겨진다.
  const plotVals =
    chartType === "candle"
      ? candleSeries.flatMap((c) => [c.low, c.high])
      : priceSeries.map((p) => p.price);
  const priceSpan = plotVals.length ? Math.max(...plotVals) - Math.min(...plotVals) : 0;
  const tickHideThreshold = priceSpan > 0 ? priceSpan * 0.1 : 0;
  const priceTick = (
    <PriceAxisTick tickFill={C.axisTick} hideNear={lastClose} hideThreshold={tickHideThreshold} />
  );

  return (
    <ChartThemeProvider value={theme}>
    <ChartShell {...shellProps}>
      {/* 이평선 색 범례 — 어느 색이 어느 기간인지 안내. showMA 일 때만, 가격 플롯 바로 위 */}
      {showMA && <MALegend />}
      {/* ① 가격 — 라인 or 캔들 (세로 높이 240→280, 사용자 요청 "약간 더 길게") */}
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "candle" ? (
            <ComposedChart data={candleSeries} syncId={SYNC_ID} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
              {/* AI 판정 리워드/리스크 존 — 가격 뒤(배경). */}
              {aiZoneEls}
              {showVolumeProfile && <VolumeProfileLayer profile={volumeProfile} />}
              {/* 볼린저 음영 밴드 — 캔들 뒤(먼저 선언). [하단,상단] 범위 Area. */}
              {showBB && (
                <Area type="monotone" dataKey="bbRange" stroke="none" fill={C.bb} fillOpacity={0.1} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              <XAxis dataKey="date" {...axisProps} dy={8} interval={xAxisInterval} minTickGap={40} ticks={xTicks} />
              <YAxis domain={["auto", "auto"]} {...axisProps} tickFormatter={fmtYAxis} width={CHART_AXIS_WIDTH} orientation="right" tick={priceTick} />
              <Tooltip content={<CandleTooltip showMA={showMA} showVWAP={showVWAP} />} />
              <Bar dataKey="wickRange" shape={<CandleBar />} maxBarSize={12} isAnimationActive={false} />
              {/* 볼린저 상·하단(실선)·중심선(SMA20 점선) — 캔들 위에 표시 */}
              {showBB && (
                <Line type="monotone" dataKey="bbUpper" stroke={C.bb} strokeWidth={1} dot={false} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              {showBB && (
                <Line type="monotone" dataKey="bbLower" stroke={C.bb} strokeWidth={1} dot={false} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              {showBB && (
                <Line type="monotone" dataKey="bbMid" stroke={C.bb} strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              {/* 이동평균선(MA 5/20/60/120)·VWAP — 캔들/라인 위에 표시(topmost). 기본 ON=MA */}
              {priceOverlayLines}
              {lastClose != null && (
                <ReferenceLine
                  y={lastClose}
                  stroke={lastPriceColor}
                  strokeDasharray="4 3"
                  strokeOpacity={0.55}
                  zIndex={DefaultZIndexes.axis + 1}
                  label={<LastPriceTag price={lastClose} color={lastPriceColor} bgColor={C.surface} />}
                />
              )}
              {/* AI 판정 목표/재진입·손절 레벨선 — 최상단(현재가선 위). */}
              {aiLineEls}
              {/* 우측 축 라벨(충돌 해소) — 최상단. */}
              {aiAxisLabelsEl}
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
              {/* AI 판정 리워드/리스크 존 — 가격 뒤(배경). */}
              {aiZoneEls}
              {showVolumeProfile && <VolumeProfileLayer profile={volumeProfile} />}
              {/* 볼린저 음영 밴드 — 가격 라인 뒤(먼저 선언). [하단,상단] 범위 Area. */}
              {showBB && (
                <Area type="monotone" dataKey="bbRange" stroke="none" fill={C.bb} fillOpacity={0.1} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              <XAxis dataKey="date" {...axisProps} dy={8} interval={xAxisInterval} minTickGap={40} ticks={xTicks} />
              <YAxis domain={["auto", "auto"]} {...axisProps} tickFormatter={fmtYAxis} width={CHART_AXIS_WIDTH} orientation="right" tick={priceTick} />
              <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipPrice} labelStyle={labelStyle} />
              <Area type="monotone" dataKey="price" stroke={C.stroke} strokeWidth={2} fillOpacity={1} fill="url(#sdcFill)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              {/* 볼린저 상·하단(실선)·중심선(SMA20 점선) — 가격 라인 위에 표시 */}
              {showBB && (
                <Line type="monotone" dataKey="bbUpper" stroke={C.bb} strokeWidth={1} dot={false} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              {showBB && (
                <Line type="monotone" dataKey="bbLower" stroke={C.bb} strokeWidth={1} dot={false} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              {showBB && (
                <Line type="monotone" dataKey="bbMid" stroke={C.bb} strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} tooltipType="none" legendType="none" />
              )}
              {/* 이동평균선(MA 5/20/60/120)·VWAP — 캔들/라인 위에 표시(topmost). 기본 ON=MA */}
              {priceOverlayLines}
              {lastClose != null && (
                <ReferenceLine
                  y={lastClose}
                  stroke={lastPriceColor}
                  strokeDasharray="4 3"
                  strokeOpacity={0.55}
                  zIndex={DefaultZIndexes.axis + 1}
                  label={<LastPriceTag price={lastClose} color={lastPriceColor} bgColor={C.surface} />}
                />
              )}
              {/* AI 판정 목표/재진입·손절 레벨선 — 최상단(현재가선 위). */}
              {aiLineEls}
              {/* 우측 축 라벨(충돌 해소) — 최상단. */}
              {aiAxisLabelsEl}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ② 거래량 (+ 거래량 이평 옵션 라인) — Bar+Line 혼합이라 ComposedChart */}
      <SubLabel label="거래량" />
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={70}>
          <ComposedChart data={volSeries} syncId={SYNC_ID} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
            <XAxis dataKey="date" {...axisProps} dy={6} hide />
            <YAxis {...axisProps} tickFormatter={fmtVolAxis} width={CHART_AXIS_WIDTH} orientation="right" />
            <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltipVol} labelStyle={labelStyle} />
            <Bar dataKey="volume" maxBarSize={6} isAnimationActive={false}>
              {volSeries.map((entry, i) => (
                <Cell key={i} fill={entry.isUp ? C.volUp : C.volDown} />
              ))}
            </Bar>
            {/* 거래량 이동평균(VMA 20) — 연빨강/연파랑 봉 위에 또렷한 라인. 툴팁·범례 제외(봉만 유지) */}
            {showVMA && (
              <Line type="monotone" dataKey="vma" stroke={C.vma} strokeWidth={1.25} dot={false} connectNulls isAnimationActive={false} tooltipType="none" legendType="none" />
            )}
          </ComposedChart>
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
                <YAxis {...axisProps} tickFormatter={(v) => Number(v).toFixed(0)} width={CHART_AXIS_WIDTH} orientation="right" />
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
                <YAxis domain={[0, 100]} {...axisProps} ticks={[0, 30, 50, 70, 100]} width={CHART_AXIS_WIDTH} orientation="right" />
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
