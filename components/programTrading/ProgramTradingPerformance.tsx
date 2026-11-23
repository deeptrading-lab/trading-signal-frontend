"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import { PROGRAM_MENU_COPY as M, PROGRAM_REVIEW_COPY as C } from "@/lib/copy/programTrading/programTrading";
import type { PaperPerformancePoint } from "@/lib/types/programTrading/programTrading";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";

const shortDate = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric", day: "numeric", timeZone: "Asia/Seoul",
});
const sessionDate = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
});

export function ProgramTradingPerformance({ points, selectedId, paginated }: { points: PaperPerformancePoint[]; selectedId?: string; paginated?: boolean }) {
  const theme = useChartTheme();
  const data = points.map(point => ({
    ...point,
    day: shortDate.format(new Date(point.finishedAt)),
  }));
  const dateTicks = data.filter((point, index) => point.day !== data[index - 1]?.day).map(point => point.id);
  const pointsById = new Map(data.map(point => [point.id, point]));

  return (
    <section aria-labelledby="program-performance" className="min-w-0 space-y-sm rounded-lg border border-border-line bg-surface p-md">
      <h2 id="program-performance" className="text-body-md font-semibold text-text-strong">{paginated ? C.sharedPerformance : C.performance}</h2>
      {data.length === 0 ? (
        <p className="text-body-sm text-text-muted">{C.performanceEmpty}</p>
      ) : (
        <>
          <p className="text-body-sm text-text-muted">{C.performanceDescription}</p>
          <div className="h-56 min-w-0 md:h-64">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 224 }}>
              <LineChart data={data} title={C.performanceDescription} margin={{ top: 8, right: 12, left: 8 }}>
                <CartesianGrid vertical={false} stroke={theme.C.grid} />
                <XAxis {...theme.axisProps} dataKey="id" ticks={dateTicks} minTickGap={24} tickFormatter={(id: string) => {
                  return pointsById.get(id)?.day ?? "";
                }} />
                <YAxis {...theme.axisProps} width={58} tickFormatter={(value: number) => formatPct(value, { digits: 2 })} />
                <ReferenceLine y={0} stroke={theme.C.axisTick} />
                <Tooltip
                  contentStyle={theme.tooltipStyle}
                  labelStyle={theme.labelStyle}
                  labelFormatter={id => {
                    const point = pointsById.get(String(id));
                    if (!point) return "";
                    return `${point.id === selectedId ? `${C.performanceSelected} · ` : ""}${sessionDate.format(new Date(point.finishedAt))} · ${M.profit} ${formatNumber(point.balanceChange, { digits: 0 })}원`;
                  }}
                  formatter={value => [formatPct(Number(value), { digits: 2, sign: true }), M.returns]}
                />
                <Line
                  type="linear"
                  dataKey="returnPct"
                  stroke={theme.C.stroke}
                  strokeWidth={2}
                  dot={({ cx, cy, payload }) => (
                    <circle
                      key={payload.id}
                      cx={cx}
                      cy={cy}
                      r={payload.id === selectedId ? 5 : 3}
                      fill={payload.returnPct >= 0 ? theme.C.stroke : theme.C.down}
                      stroke={payload.id === selectedId ? theme.C.tooltipText : theme.C.surface}
                      strokeWidth={2}
                    />
                  )}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
