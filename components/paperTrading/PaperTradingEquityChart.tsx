"use client";

/**
 * PaperTradingEquityChart — 세션 상세 자산 곡선(영역+라인, recharts).
 *
 * `PaperTradingDetailContainer` 에서 분리(mobile-perf-bundle): recharts(~100KB gz)를 쓰는
 * 유일한 섹션이라 컨테이너가 `next/dynamic` 으로 지연 로드한다 → `/intraday/[sessionId]`
 * 진입 번들에서 recharts 이탈, 차트 자리만 스켈레톤 1회.
 *
 * 색은 시작 투자금 대비 손익 방향(한국식: 이익=빨강, 손실=파랑), 시작 투자금은 점선 기준선.
 * 축·툴팁은 useChartTheme(다크 대응 SSOT) 재사용.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import { formatNumber, formatPct } from "./format";
import type { PaperTradingEquityPoint } from "@/lib/types/paperTrading/paperTrading";

/** 원화 축 라벨 — 300만·1.2억처럼 축약(자릿수 잘림 방지). */
function fmtKrwCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) {
    return `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  }
  if (abs >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
  }
  return value.toLocaleString("ko-KR");
}

/** ISO → KST "HH:mm" (자산 곡선 X축·툴팁). */
function kstHhmm(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function PaperTradingEquityChart({
  points,
  initialCash,
}: {
  points: PaperTradingEquityPoint[];
  initialCash: number;
}) {
  const theme = useChartTheme();
  const last = points.at(-1);
  const lineColor = (last?.value ?? initialCash) >= initialCash ? theme.C.stroke : theme.C.down;
  const labelFor = (index: number): string => {
    if (index < 0) return "시작";
    const point = points.find((p) => p.tickIndex === index);
    return point ? kstHhmm(point.at) : "";
  };

  return (
    <div className="h-[260px] w-full min-w-0">
      {/* initialDimension — 첫 렌더에서 컨테이너 측정 전(-1) recharts 경고 방지(레이아웃 확정 후 실측으로 대체). */}
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 260 }}>
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={theme.C.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="tickIndex"
            {...theme.axisProps}
            tickFormatter={labelFor}
            minTickGap={32}
            tickMargin={6}
          />
          <YAxis
            {...theme.axisProps}
            width={56}
            tickFormatter={fmtKrwCompact}
            // 변동이 작아도 라인이 축에 붙지 않게 ±0.3% 여백.
            domain={[
              (dataMin: number) => dataMin * 0.997,
              (dataMax: number) => dataMax * 1.003,
            ]}
          />
          <Tooltip
            contentStyle={theme.tooltipStyle}
            labelStyle={theme.labelStyle}
            formatter={(value) => [`${formatNumber(Number(value))}원`, "평가금액"]}
            labelFormatter={(label, payload) => {
              const returnPct = payload?.[0]?.payload?.returnPct as number | undefined;
              const time = labelFor(Number(label));
              return returnPct != null && Number(label) >= 0
                ? `${time} · ${formatPct(returnPct)}`
                : time;
            }}
          />
          <ReferenceLine
            y={initialCash}
            stroke={theme.C.axisTick}
            strokeDasharray="4 4"
            strokeOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#equityFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
