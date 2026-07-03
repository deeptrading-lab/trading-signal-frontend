/**
 * IntradayMiniChart — 워치 펼침 차트 탭의 당일 분봉 캔들 차트. intraday-paper-watch.
 *
 * AI 가 보는 것과 같은 분봉(세션 주기에서 파생된 타임프레임)의 캔들(시고저종) + 가상 체결
 * 지점(매수 빨강/매도 파랑 점)을 겹쳐 보여준다. 장중엔 훅이 60초 간격으로 자동 갱신.
 * 캔들 shape·툴팁은 스톡 차트 아톰(CandleBar·CandleTooltip) 재사용 — 부하는 라인과 사실상
 * 동일(동일 API·SVG 노드 수백 개 수준). 색·축은 차트 테마 SSOT(useChartTheme).
 */

"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQueryMinuteChart } from "@/hooks/stock/useQueryMinuteChart";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
// 캔들 아톰 — 스톡 일봉 차트와 공용(도메인 무관 차트 조각, components/ui 승격 후보).
import { ChartThemeProvider } from "@/components/profile/chart/ChartThemeContext";
import { CandleBar } from "@/components/profile/chart/CandleBar";
import { CandleTooltip } from "@/components/profile/chart/CandleTooltip";
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

/** 주문 시각(UTC) → 분봉 버킷 "HH:mm"(KST·타임프레임 내림) — 캔들 x(당일 유일)와 매칭. */
function orderBucket(atIso: string, timeframe: number): string {
  const kst = new Date(new Date(atIso).getTime() + 9 * 3_600_000);
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const floored = Math.floor(mins / Math.max(1, timeframe)) * Math.max(1, timeframe);
  return `${pad(Math.floor(floored / 60))}:${pad(floored % 60)}`;
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

  // CandleBar 계약: wickRange(range dataKey)=[low,high], payload 에 open/close/high/low/isUp.
  // 당일 단일 세션이라 x 는 "HH:mm" 으로 유일 — 툴팁 라벨도 그대로 쓴다.
  const series = candles.map((candle, index) => {
    const prevClose = index > 0 ? candles[index - 1].close : null;
    return {
      ...candle,
      date: candle.date.slice(-5),
      wickRange: [candle.low, candle.high] as [number, number],
      isUp: candle.close >= candle.open,
      change: prevClose != null ? candle.close - prevClose : null,
      changePct: prevClose ? ((candle.close - prevClose) / prevClose) * 100 : null,
    };
  });
  const candleKeys = new Set(series.map((row) => row.date));
  const markers = orders
    .map((order) => ({ ...order, x: orderBucket(order.at, timeframe) }))
    .filter((order) => candleKeys.has(order.x));

  return (
    <div className="h-[220px] w-full min-w-0">
      <ChartThemeProvider value={theme}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 600, height: 220 }}
        >
          <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={theme.C.grid} strokeDasharray="3 3" />
            <XAxis dataKey="date" {...theme.axisProps} minTickGap={40} tickMargin={6} />
            <YAxis
              {...theme.axisProps}
              width={56}
              tickFormatter={(v: number) => formatMoney(v)}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CandleTooltip />} />
            <Bar dataKey="wickRange" shape={<CandleBar />} maxBarSize={8} isAnimationActive={false} />
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
          </ComposedChart>
        </ResponsiveContainer>
      </ChartThemeProvider>
    </div>
  );
}
