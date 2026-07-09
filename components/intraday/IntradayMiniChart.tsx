/**
 * IntradayMiniChart — 워치 펼침 차트 탭의 당일 분봉 캔들 차트. intraday-paper-watch.
 *
 * AI 가 보는 것과 같은 분봉(세션 주기에서 파생된 타임프레임)의 캔들(시고저종) + 가상 체결
 * 지점을 겹쳐 보여준다. 체결은 **화살표 + B/S 글자**로 표시 — 매수 B(빨강, 가격 아래에서 위로
 * 찌르는 삼각형), 매도 S(파랑, 가격 위에서 아래로). 단순 점보다 방향·매매구분이 한눈에 들어온다.
 * 장중엔 훅이 60초 간격으로 자동 갱신. 캔들 shape·툴팁은 스톡 차트 아톰(CandleBar·CandleTooltip)
 * 재사용. 색·축은 차트 테마 SSOT(useChartTheme).
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

/**
 * 체결 마커(원형 핀) 치수(px) — 캔들(maxBarSize 8)과 확실히 구분되게 꽉 찬 색 원 + 흰 글자.
 * 꼬리(삼각형)가 정확한 체결가를 가리키고 원은 그 바깥에 떠서 같은 색 캔들 사이에서도 안 묻힌다.
 */
const MARKER_GAP = 11; // 가격 포인트 ↔ 꼬리 꼭짓점 여백(캔들과 살짝 띄워 겹침 방지)
const MARKER_TAIL_H = 10; // 꼬리 높이(A1 — 눈에 띄게 키움)
const MARKER_TAIL_W = 6; // 꼬리 반너비
const MARKER_RADIUS = 9; // 배지 원 반지름

/**
 * 체결 마커 기하 — 매수는 가격 아래(꼬리가 위로 찌름), 매도는 가격 위(꼬리 아래로). 꼬리 삼각형
 * 꼭짓점이 체결가를 가리키고, 그 바깥에 배지 원(중심 circleY)을 띄운다. 순수 함수(테스트 대상).
 */
export function tradeMarkerGeometry(
  cx: number,
  cy: number,
  side: "BUY" | "SELL",
): { tailPoints: string; circleX: number; circleY: number; radius: number } {
  const dir = side === "BUY" ? 1 : -1; // +1 = 가격 아래(매수), -1 = 가격 위(매도)
  const tipY = cy + dir * MARKER_GAP; // 꼬리 꼭짓점(체결가 쪽)
  const tailBaseY = cy + dir * (MARKER_GAP + MARKER_TAIL_H); // 꼬리 밑변(원과 맞닿음)
  return {
    tailPoints: `${cx},${tipY} ${cx - MARKER_TAIL_W},${tailBaseY} ${cx + MARKER_TAIL_W},${tailBaseY}`,
    circleX: cx,
    circleY: cy + dir * (MARKER_GAP + MARKER_TAIL_H + MARKER_RADIUS),
    radius: MARKER_RADIUS,
  };
}

/** 배지 원 흰색 링 두께(px) — 채도 높은 원을 캔들과 완전히 분리해 버튼처럼 도드라지게. */
const MARKER_RING_WIDTH = 2;

/**
 * recharts ReferenceDot `shape` 커스텀 마커 — cx/cy 는 recharts 가 주입(x/y → 픽셀 좌표).
 * 원형 핀(꼬리 삼각형 + 꽉 찬 색 원 + 흰 링 + 흰 B/S 글자). 원 색은 캔들 테마 재사용(매수 빨강
 * stroke / 매도 파랑 down). 흰 링·흰 글자는 다크/라이트 모두에서 채도 높은 원 위 대비를 보장한다.
 */
function IntradayTradeMarker(props: {
  cx?: number;
  cy?: number;
  side: "BUY" | "SELL";
  color: string;
}) {
  const { cx, cy, side, color } = props;
  if (cx == null || cy == null) return null;
  const { tailPoints, circleX, circleY, radius } = tradeMarkerGeometry(cx, cy, side);
  return (
    <g>
      <polygon points={tailPoints} fill={color} />
      <circle
        cx={circleX}
        cy={circleY}
        r={radius}
        fill={color}
        stroke="#ffffff"
        strokeWidth={MARKER_RING_WIDTH}
      />
      <text
        x={circleX}
        y={circleY}
        fill="#ffffff"
        fontSize={11}
        fontWeight={800}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {side === "BUY" ? "B" : "S"}
      </text>
    </g>
  );
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
                // 점 대신 원형 핀(꼬리+원+흰 링+흰 글자) — 매수 B 빨강·매도 S 파랑.
                shape={
                  <IntradayTradeMarker
                    side={marker.side}
                    color={marker.side === "BUY" ? theme.C.stroke : theme.C.down}
                  />
                }
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartThemeProvider>
    </div>
  );
}
