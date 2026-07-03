/**
 * IntradayMiniChart — 워치 펼침 차트 탭의 당일 분봉 미니 차트. intraday-paper-watch.
 *
 * AI 가 보는 것과 같은 분봉(세션 주기에서 파생된 타임프레임)의 종가 흐름 + 가상 체결
 * 지점(매수 빨강/매도 파랑 점)을 겹쳐 보여준다. 장중엔 훅이 60초 간격으로 자동 갱신.
 * 색·축·툴팁은 차트 테마 SSOT(useChartTheme) 재사용.
 */

"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQueryMinuteChart } from "@/hooks/stock/useQueryMinuteChart";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import { formatMoney } from "@/lib/utils/formatMoney";
import { INTRADAY_PAPER_COPY as P } from "@/lib/copy/stock/intradayRead";

export interface IntradayChartOrderMarker {
  /** 체결 틱 시각(ISO UTC). */
  at: string;
  price: number;
  side: "BUY" | "SELL";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 주문 시각(UTC) → 분봉 버킷 키("YYYY-MM-DDTHH:mm", KST·타임프레임 내림) — 캔들 x 와 매칭. */
function orderBucket(atIso: string, timeframe: number): string {
  const kst = new Date(new Date(atIso).getTime() + 9 * 3_600_000);
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const floored = Math.floor(mins / Math.max(1, timeframe)) * Math.max(1, timeframe);
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}T${pad(
    Math.floor(floored / 60),
  )}:${pad(floored % 60)}`;
}

export function IntradayMiniChart({
  ticker,
  timeframe,
  orders,
}: {
  ticker: string;
  timeframe: number;
  orders: IntradayChartOrderMarker[];
}) {
  const theme = useChartTheme();
  const { data: candles = [], isLoading, isError } = useQueryMinuteChart(ticker, timeframe);

  if (isLoading) {
    return <p className="text-caption text-text-muted">{P.table.chartLoading}</p>;
  }
  if (isError) {
    return <p className="text-caption text-signal-down">{P.table.chartError}</p>;
  }
  if (candles.length === 0) {
    return <p className="text-caption text-text-muted">{P.table.chartEmpty}</p>;
  }

  const dayOpen = candles[0].open;
  const last = candles.at(-1)!.close;
  const lineColor = last >= dayOpen ? theme.C.stroke : theme.C.down;
  const candleKeys = new Set(candles.map((c) => c.date));
  const markers = orders
    .map((order) => ({ ...order, x: orderBucket(order.at, timeframe) }))
    .filter((order) => candleKeys.has(order.x));
  const gradientId = `intradayFill-${ticker}`;

  return (
    <div className="h-[220px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 220 }}>
        <AreaChart data={candles} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={theme.C.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            {...theme.axisProps}
            tickFormatter={(v: string) => v.slice(-5)}
            minTickGap={40}
            tickMargin={6}
          />
          <YAxis
            {...theme.axisProps}
            width={56}
            tickFormatter={(v: number) => formatMoney(v)}
            domain={[
              (dataMin: number) => dataMin * 0.998,
              (dataMax: number) => dataMax * 1.002,
            ]}
          />
          <Tooltip
            contentStyle={theme.tooltipStyle}
            labelStyle={theme.labelStyle}
            formatter={(value) => [`${formatMoney(Number(value))}원`, "종가"]}
            labelFormatter={(label) => String(label ?? "").slice(-5)}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
          {markers.map((marker, index) => (
            <ReferenceDot
              key={`${marker.x}-${index}`}
              x={marker.x}
              y={marker.price}
              r={4}
              fill={marker.side === "BUY" ? theme.C.stroke : theme.C.down}
              stroke={theme.C.surface}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
