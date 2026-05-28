/**
 * StockDailyChart — `/profile/[ticker]` 일봉 가격 차트.
 *
 * PRD `stock-api-integration` (PR-B) §3.5 — `useQueryStockDaily(ticker, 'D')` 호출 + recharts AreaChart.
 *
 * PriceChart (`components/home/PriceChart.tsx`) 패턴 정합 — ResizeObserver 직접 측정 + 색 토큰
 * (`signal-up` 빨강 cascade) + tabular-nums tooltip. 입력 데이터만 다름 (mock vs KIS 일자별).
 *
 * 응답 가공:
 *   - KIS 의 `StockDailyCandle[]` (date YYYY-MM-DD + open/high/low/close/volume)
 *     → recharts 가 요구하는 `{ date, price }[]` (종가만 사용).
 *   - 응답 배열은 KIS 가 최근일 → 과거 순으로 줄 가능성. 차트 X축 단조 증가 보장을 위해 정렬.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useQueryStockDaily } from "@/hooks/stock/useQueryStockDaily";
import { formatNumber } from "@/lib/utils/formatMoney";
import {
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
  STOCK_DETAIL_PRICE_CHART_TITLE,
} from "@/lib/copy/profile/stockDetail";

// 차트 색 — v8 토큰 hex 그대로 흡수 (tailwind.theme.json 동기). PriceChart 와 동일 cascade.
const CHART_TOKENS = {
  stroke: "#c81e1e",
  fill: "#c81e1e",
  axisTick: "#5b6470",
  grid: "#eceff3",
  tooltipBg: "#ffffff",
  tooltipText: "#0f1419",
} as const;

export interface StockDailyChartProps {
  ticker: string;
}

function formatYAxis(value: number): string {
  return `${formatNumber(value / 10_000, { digits: 0 })}만`;
}

function formatTooltipValue(value: unknown): [string, string] {
  const num = typeof value === "number" ? value : Number(value);
  return [`${formatNumber(Number.isFinite(num) ? num : 0)} 원`, "종가"];
}

export function StockDailyChart({ ticker }: StockDailyChartProps) {
  const { data, isLoading, isError, error } = useQueryStockDaily(ticker, "D");
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // recharts 친화 변환 — 종가만 사용, 날짜 오름차순.
  const series = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((candle) => ({ date: candle.date.slice(5), price: candle.close }));
  }, [data]);

  return (
    <section className="card" aria-label={STOCK_DETAIL_PRICE_CHART_TITLE}>
      <header className="flex justify-between items-center mb-md">
        <h2 className="text-h2 text-text-strong">
          {STOCK_DETAIL_PRICE_CHART_TITLE}
        </h2>
      </header>

      {isLoading ? (
        <div
          className="flex items-center justify-center h-[320px] text-text-muted"
          aria-busy="true"
        >
          {STOCK_DETAIL_LOADING}
        </div>
      ) : isError ? (
        <div className="card-critical" role="alert">
          <p className="text-body-strong">
            {error?.message ?? STOCK_DETAIL_NOT_FOUND}
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="h-[320px] w-full min-w-0">
          {size.width > 0 && size.height > 0 && series.length > 0 ? (
            <AreaChart
              width={size.width}
              height={size.height}
              data={series}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="stockDailyChartFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
                fill="url(#stockDailyChartFill)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          ) : null}
        </div>
      )}
    </section>
  );
}
