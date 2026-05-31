/**
 * StockDailyChart — 종목 상세 가격 차트 + 보조지표 서브플롯.
 *
 * 데이터 소스: `inquire-daily-itemchartprice`(FHKST03010100, 최대 100봉) — `useQueryStockChart`.
 * 기존 `inquire-daily-price`(최근 30건)보다 많은 봉을 확보해 MACD(26+9), RSI(14) 계산 정밀화.
 *
 * 서브플롯 구성 (syncId="stock-chart" 로 호버 연동):
 *   1. 가격 (240px) — 캔들(기본) 또는 라인. 하단에 날짜축(일정 간격) 표시.
 *   2. 거래량 BarChart (70px) — `acml_vol` (추가 KIS 콜 0)
 *   3. MACD ComposedChart (90px) — 히스토그램(Bar) + MACD·시그널 라인(Line)
 *   4. RSI LineChart (80px) — 14기간 RSI + 과매수(70)/과매도(30) 기준선
 *
 * 차트 컨트롤(차트타입·봉·기간) 상태는 상위 StockPageLayout 가 소유(controlled) — 확대/축소 토글 시
 *   리마운트되어도 선택값 보존. 상수/기본값은 `./stockChartConfig` 단일 소스.
 */

"use client";

import { useMemo } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
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
import { useQueryStockChart, type ChartPeriod } from "@/hooks/stock/useQueryStockChart";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { calcMACD, calcRSI } from "@/lib/utils/technicalIndicators";
import {
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
  STOCK_DETAIL_PRICE_CHART_TITLE,
} from "@/lib/copy/profile/stockDetail";
import { ChartRangeDropdown } from "./ChartRangeDropdown";
import {
  CHART_TYPES,
  PERIODS,
  PERIOD_UNIT,
  RANGES,
  type ChartType,
} from "./stockChartConfig";

const SYNC_ID = "stock-chart";

/**
 * 보조지표 워밍업(캘린더일) — 보기 구간보다 더 과거까지 받아 MACD(시그널 35봉)·RSI(15봉)를
 *   끊김 없이 계산한 뒤, 표시는 사용자가 고른 구간으로 잘라낸다(아래 useMemo).
 *   → 주봉 3개월·월봉 1년처럼 짧은 구간이나 최근 며칠만 봐도 지표가 항상 나온다.
 *   봉당 대략 봉수: 일봉≈영업일, 주봉≈/7, 월봉≈/30. 35봉 확보분 + 여유.
 */
const WARMUP_DAYS: Record<ChartPeriod, number> = { D: 60, W: 280, M: 1100 };
const MAX_FETCH_DAYS = 3000; // 라우트 MAX_DAYS 와 정합(초과 클램프)

const C = {
  stroke: "#c81e1e",    // signal-up (빨강)
  fill: "#c81e1e",
  axisTick: "#5b6470",
  grid: "#eceff3",
  tooltipBg: "rgba(255,255,255,0.82)", // 반투명 — 뒤 그래프가 어느 정도 비치도록
  tooltipText: "#0f1419",
  macdLine: "#2563eb",   // 파랑
  signalLine: "#f59e0b", // 앰버
  histUp: "#16a34a",     // 초록
  histDown: "#dc2626",   // 빨강
  rsiLine: "#7c3aed",    // 보라
  refOB: "#dc2626",      // 과매수
  refOS: "#2563eb",      // 과매도
  refMid: "#9ca3af",     // 중립
  volUp: "#fca5a5",
  volDown: "#93c5fd",
} as const;

// 차트 타입/봉/기간 상수·타입·기본값은 `./stockChartConfig` 단일 소스. (상태는 StockPageLayout 소유)

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

function fmtYAxis(v: number): string {
  return `${formatNumber(v / 10_000, { digits: 0 })}만`;
}
function fmtVolAxis(v: number): string {
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${v}`;
}
function fmtTooltipPrice(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [`${formatNumber(Number.isFinite(n) ? n : 0)} 원`, "종가"];
}
function fmtTooltipVol(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [Number.isFinite(n) ? n.toLocaleString() : "0", "거래량"];
}
function fmtTooltipMACD(value: unknown, name: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  const display = Number.isFinite(n) ? n.toFixed(2) : "-";
  const label = name === "histogram" ? "히스토그램" : name === "macd" ? "MACD" : "시그널";
  return [display, label];
}
function fmtTooltipRSI(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [Number.isFinite(n) ? n.toFixed(1) : "-", "RSI"];
}

// ── 캔들스틱 커스텀 shape ──────────────────────────────
// recharts Bar에 wickRange: [low, high] 을 range dataKey로 주면
// props.y = yScale(high), props.y + props.height = yScale(low).
// 이 scale 정보를 이용해 open/close body와 wick을 정확히 위치시킨다.

function CandleBar(props: {
  x?: number; y?: number; width?: number; height?: number;
  payload?: { open: number; close: number; high: number; low: number; isUp: boolean };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload || width <= 0 || height <= 0) return null;
  const { open, close, high, low, isUp } = payload;
  if (high < low) return null;

  const color = isUp ? C.stroke : C.macdLine;
  const scale = height / (high - low); // px per value unit
  const bodyTop = y + (high - Math.max(open, close)) * scale;
  const bodyH = Math.max(Math.abs(open - close) * scale, 1);
  const wickX = x + width / 2;
  const barW = Math.max(width - 2, 2);

  return (
    <g>
      {/* 위 꼬리 */}
      <line x1={wickX} y1={y} x2={wickX} y2={bodyTop} stroke={color} strokeWidth={1} />
      {/* 몸통 */}
      <rect x={x + 1} y={bodyTop} width={barW} height={bodyH} fill={color} />
      {/* 아래 꼬리 */}
      <line x1={wickX} y1={bodyTop + bodyH} x2={wickX} y2={y + height} stroke={color} strokeWidth={1} />
    </g>
  );
}

// 캔들 툴팁
function CandleTooltip({ active, payload, label }: {
  active?: boolean; payload?: { payload: { open: number; close: number; high: number; low: number } }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;
  const color = isUp ? C.stroke : C.macdLine;
  return (
    <div style={{ ...tooltipStyle, padding: "8px 12px", minWidth: 130 }}>
      <p style={{ color: C.axisTick, marginBottom: 6, fontSize: 11 }}>{label}</p>
      {(["high", "open", "close", "low"] as const).map((k) => (
        <p key={k} style={{ color: k === "close" ? color : C.tooltipText, fontSize: 12, lineHeight: "1.6" }}>
          {k === "high" ? "고" : k === "open" ? "시" : k === "close" ? "종" : "저"}&nbsp;
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatNumber(d[k])} 원</span>
        </p>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(15,20,25,0.08)", // 반투명 배경 경계 보강
  boxShadow: "0 4px 12px rgba(23,32,42,0.1)",
  backgroundColor: C.tooltipBg,
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
  color: C.tooltipText,
  fontSize: 12,
};
const labelStyle = { color: C.axisTick, marginBottom: 4 };
const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: C.axisTick },
} as const;

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
  // 워밍업 포함 fetch — 보기 구간(days)보다 더 과거까지 받아 지표 계산용 데이터 확보.
  const fetchDays = Math.min(days + WARMUP_DAYS[period], MAX_FETCH_DAYS);
  const { data, isLoading, isError, error } = useQueryStockChart(ticker, { period, days: fetchDays });

  const { priceSeries, candleSeries, volSeries, macdSeries, rsiSeries } = useMemo(() => {
    if (!data || data.length === 0) {
      return { priceSeries: [], candleSeries: [], volSeries: [], macdSeries: [], rsiSeries: [] };
    }

    // 1) 전체(워밍업 포함) 데이터로 지표 계산 — 표준 파라미터(MACD 12/26/9, RSI 14) 유지.
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const closes = sorted.map((c) => c.close);
    const macd = calcMACD(closes);
    const rsi = calcRSI(closes);

    // 2) 보기 구간 컷오프 — 마지막 봉 날짜에서 days 캘린더일 이전. 워밍업 구간은 표시에서 잘라낸다.
    const lastDate = sorted[sorted.length - 1].date; // "YYYY-MM-DD"
    const [ly, lm, ld] = lastDate.split("-").map(Number);
    const cutoff = new Date(ly, lm - 1, ld);
    cutoff.setDate(cutoff.getDate() - days);
    const pad = (n: number) => String(n).padStart(2, "0");
    const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
    let visibleStart = sorted.findIndex((c) => c.date >= cutoffStr);
    if (visibleStart < 0) visibleStart = 0;

    // 3) 전체 시리즈 빌드 후 보기 구간으로 슬라이스(지표는 워밍업 덕에 첫 봉부터 값이 있음).
    const fullPrice = sorted.map((c) => ({ date: c.date.slice(5), price: c.close }));
    const fullCandle = sorted.map((c) => ({
      date: c.date.slice(5),
      wickRange: [c.low, c.high] as [number, number],
      open: c.open,
      close: c.close,
      high: c.high,
      low: c.low,
      isUp: c.close >= c.open,
    }));
    const fullVol = sorted.map((c) => ({
      date: c.date.slice(5),
      volume: c.volume,
      isUp: c.close >= c.open,
    }));
    const fullMacd = sorted.map((c, i) => ({
      date: c.date.slice(5),
      macd: macd[i].macd,
      signal: macd[i].signal,
      histogram: macd[i].histogram,
    }));
    const fullRsi = sorted.map((c, i) => ({ date: c.date.slice(5), rsi: rsi[i] }));

    return {
      priceSeries: fullPrice.slice(visibleStart),
      candleSeries: fullCandle.slice(visibleStart),
      volSeries: fullVol.slice(visibleStart),
      macdSeries: fullMacd.slice(visibleStart),
      rsiSeries: fullRsi.slice(visibleStart),
    };
  }, [data, days]);

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
  );
}

function ChartShell({
  children,
  expanded,
  onExpand,
  onCollapse,
  period,
  days,
  onPeriodChange,
  onDaysChange,
  chartType,
  onChartTypeChange,
}: {
  children: React.ReactNode;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  period: ChartPeriod;
  days: number;
  onPeriodChange: (p: ChartPeriod) => void;
  onDaysChange: (d: number) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
}) {
  const { isMobile } = useBreakpoint();
  const hasToggle = onExpand || onCollapse;
  const ranges = RANGES[period];

  return (
    <section className="card" aria-label={STOCK_DETAIL_PRICE_CHART_TITLE}>
      {/* 헤더 행 1: 타이틀 + 확대/축소 버튼 */}
      <header className="flex justify-between items-center mb-sm">
        <h2 className="text-h2 text-text-strong">{STOCK_DETAIL_PRICE_CHART_TITLE}</h2>
        {hasToggle && (
          <button
            type="button"
            className="button-icon"
            aria-label={expanded ? "차트 축소" : "차트 확대"}
            onClick={expanded ? onCollapse : onExpand}
          >
            {expanded
              ? <Minimize2 className="h-4 w-4" aria-hidden="true" />
              : <Maximize2 className="h-4 w-4" aria-hidden="true" />
            }
          </button>
        )}
      </header>

      {/* 헤더 행 2: 차트타입 + 봉 선택 / 기간 선택 */}
      <div className="flex items-center justify-between mb-md gap-sm flex-wrap">
        {/* 좌측: 라인/캔들 토글 + 봉 종류 */}
        <div className="flex items-center gap-sm">
          <div className="flex items-center rounded-sm overflow-hidden border border-border-line">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.type}
                type="button"
                onClick={() => onChartTypeChange(ct.type)}
                className={cn(
                  "px-sm py-[3px] text-caption font-medium transition-colors cursor-pointer",
                  chartType === ct.type
                    ? "bg-accent-vivid text-surface"
                    : "text-text-muted hover:text-text-strong hover:bg-surface-muted",
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-xs">
            {PERIODS.map((p) => (
              <button
                key={p.period}
                type="button"
                onClick={() => onPeriodChange(p.period)}
                className={cn(
                  "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer",
                  period === p.period
                    ? "bg-accent-vivid text-surface"
                    : "text-text-muted hover:text-text-strong hover:bg-surface-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {/* 우측: 기간 범위 — 모바일은 드롭다운(줄바꿈 방지), 데스크탑은 버튼 목록 */}
        {isMobile ? (
          <ChartRangeDropdown ranges={ranges} value={days} onChange={onDaysChange} />
        ) : (
          <div className="flex items-center gap-xs">
            {ranges.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => onDaysChange(r.days)}
                className={cn(
                  "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer",
                  days === r.days
                    ? "bg-surface-muted text-text-strong"
                    : "text-text-muted hover:text-text-strong",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {children}
    </section>
  );
}

// 보조지표 섹션 헤더 — 상단 구분선 + 진한 타이틀로 메인↔보조, 보조↔보조 경계를 또렷하게.
function SubLabel({ label }: { label: string }) {
  return (
    <div className="mt-md mb-xs pt-md border-t border-border-line">
      <p className="text-caption font-semibold text-text-strong px-xs">{label}</p>
    </div>
  );
}
