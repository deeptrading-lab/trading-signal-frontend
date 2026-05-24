/**
 * PriceChart — 가격 추이 AreaChart (recharts).
 *
 * PR6 (finsight-redesign) 신규 — **recharts 첫 사용자** (본 저장소 기준).
 *
 * 시안 `AssetChart.tsx` 정합 — `ResponsiveContainer + AreaChart + Area + XAxis + YAxis +
 * Tooltip + CartesianGrid + defs/linearGradient`. 시안의 hex (`#ef4444`, `#64748b`, `#334155`)
 * 대신 v8 디자인 토큰(`signal-up` 등) 을 CSS 변수 또는 Tailwind theme 함수로 흡수.
 *
 * 색 cascade:
 *   - stroke = 한국식 상승(빨강) `signal-up` (#c81e1e). 본 mock 은 상승 흐름이므로 빨강 사용.
 *   - fill gradient = `signal-up` 30%→0% 페이드 (시안과 동일 톤).
 *   - grid / axis tick = `text-muted` (#5b6470).
 *
 * 차트 색 hex 노출 — recharts API 가 stroke/fill 에 CSS-friendly 값을 요구한다. Tailwind theme
 * 토큰 값을 그대로 표기하면 DRY 가 흔들리므로, 한 곳(`CHART_TOKENS`)에 모아두고 본 컴포넌트
 * 안에서만 노출. 후속 PRD 에서 `getComputedStyle(root)` 등 동적 토큰 흡수로 발전 가능.
 *
 * 'use client' — recharts ResponsiveContainer 가 DOM 측정 (ResizeObserver) 을 요구.
 */

"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatNumber } from "@/lib/utils/formatMoney";
import type { PriceSeries } from "@/lib/types/home/priceChart";

// 차트 색 — v8 토큰 hex 값 그대로 흡수 (tailwind.theme.json 동기).
// 본 컴포넌트 외부에서는 항상 Tailwind 토큰 (`text-signal-up` 등) 사용.
const CHART_TOKENS = {
  // colors.signal-up — 한국식 상승 (빨강).
  stroke: "#c81e1e",
  fill: "#c81e1e",
  // colors.text-muted — 축 tick / grid.
  axisTick: "#5b6470",
  // colors.border-line — grid line.
  grid: "#eceff3",
  // colors.surface (배경) / text-strong (텍스트) — tooltip.
  tooltipBg: "#ffffff",
  tooltipText: "#0f1419",
} as const;

export interface PriceChartProps {
  data: PriceSeries;
}

function formatYAxis(value: number): string {
  // 시안 정합 — "1,234만" 같은 한국식 단위 표기.
  return `${formatNumber(value / 10000, { digits: 0 })}만`;
}

function formatTooltipValue(value: unknown): [string, string] {
  const num = typeof value === "number" ? value : Number(value);
  return [`${formatNumber(Number.isFinite(num) ? num : 0)} 원`, "가격"];
}

export function PriceChart({ data }: PriceChartProps) {
  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={CHART_TOKENS.fill}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={CHART_TOKENS.fill}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={CHART_TOKENS.grid}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: CHART_TOKENS.axisTick }}
            dy={10}
          />
          <YAxis
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: CHART_TOKENS.axisTick }}
            width={60}
            orientation="right"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(23, 32, 42, 0.1)",
              backgroundColor: CHART_TOKENS.tooltipBg,
              color: CHART_TOKENS.tooltipText,
            }}
            formatter={formatTooltipValue}
            labelStyle={{ color: CHART_TOKENS.axisTick, marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={CHART_TOKENS.stroke}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#priceChartFill)"
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
