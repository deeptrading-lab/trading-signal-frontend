/**
 * AiLevelAxisLabels — AI 판정 레벨(목표/재진입·손절)을 **우측 가격 축 위**에 현재가 태그처럼 붙이는
 * 커스텀 레이어. recharts v3 컨텍스트 훅(`useYAxisScale`·`usePlotArea`)으로 가격→픽셀 스케일을
 * 차트와 공유한다(VolumeProfileLayer 와 동일 — v3 은 Customized 에 축맵을 안 준다). 차트의 직접
 * 자식으로 렌더해야 컨텍스트가 잡힌다.
 *
 * 현재가 태그(우측·채움)와 같은 자리(축 위)에 **가격만** 얹되, 개별 ReferenceLine label 은 서로를
 * 몰라 가까운 레벨끼리 겹치므로 여기서 전 레벨 픽셀 y 를 모아 **충돌 해소**(최소 간격 확보로 아래로
 * 밀기, 현재가 알약 회피)한다. 현재가(채움)와 구분되게 **아웃라인 알약**(테두리=레벨색). 역할(목표/
 * 재진입/손절)은 색 + 배너 레전드가 안내. 밀린 알약엔 실제 선까지 짧은 연결선.
 */

"use client";

import { useYAxisScale, usePlotArea } from "recharts";
import { useChartThemeContext } from "./ChartThemeContext";
import { formatNumber } from "@/lib/utils/formatMoney";
import { CHART_AXIS_WIDTH } from "../stockChartConfig";
import type { AiVerdictLevels } from "@/lib/utils/aiVerdictLevels";

interface PlacedLabel {
  text: string;
  color: string;
  y0: number;
  y: number;
}

const BOX_H = 18;
const GAP = BOX_H + 2;
const PAD_X = 6;

function estimateWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 0x2e80 ? 11 : 6.2;
  return w;
}

export function AiLevelAxisLabels({
  levels,
  lastClose,
}: {
  levels: AiVerdictLevels;
  lastClose: number | null;
}) {
  const yScale = useYAxisScale();
  const plot = usePlotArea();
  const { C } = useChartThemeContext();

  if (!yScale || !plot) return null;

  const plotRight = plot.x + plot.width;
  const axisRight = plotRight + CHART_AXIS_WIDTH; // 현재가 태그와 같은 우측 축 끝(우정렬 기준)
  const top = plot.y;
  const bottom = plot.y + plot.height;

  const labels: PlacedLabel[] = [];
  if (levels.target) {
    const isTarget = levels.target.role === "target";
    const y0 = yScale(levels.target.price);
    if (y0 != null) {
      labels.push({
        text: formatNumber(levels.target.price, { digits: 0 }),
        // 목표=상승색(빨강) / 재진입=앰버(회색은 안 보임 — 빨강·파랑과 구분되는 눈에 띄는 색).
        color: isTarget ? C.stroke : C.signalLine,
        y0,
        y: 0,
      });
    }
  }
  const stopY0 = yScale(levels.stop.price);
  if (stopY0 != null) {
    labels.push({ text: formatNumber(levels.stop.price, { digits: 0 }), color: C.down, y0: stopY0, y: 0 });
  }
  if (labels.length === 0) return null;

  // 충돌 해소 — 이상 y(y0) 오름차순 후 최소 간격 확보하며 아래로 밀기. 현재가 알약 회피.
  const currentY = lastClose != null ? yScale(lastClose) : null;
  labels.sort((a, b) => a.y0 - b.y0);
  let prevY = -Infinity;
  for (const l of labels) {
    let y = Math.max(l.y0, prevY + GAP);
    if (currentY != null && Math.abs(y - currentY) < GAP) y = currentY + GAP;
    l.y = y;
    prevY = y;
  }
  for (const l of labels) l.y = Math.min(Math.max(l.y, top + BOX_H / 2), bottom - BOX_H / 2);

  return (
    <g pointerEvents="none">
      {labels.map((l, i) => {
        const boxW = Math.ceil(estimateWidth(l.text)) + PAD_X * 2;
        const boxX = axisRight - boxW;
        const boxY = l.y - BOX_H / 2;
        const nudged = Math.abs(l.y - l.y0) > 1;
        return (
          <g key={i}>
            {/* 밀렸으면 실제 선 높이(y0) → 알약(y) 짧은 세로 연결선(알약 좌측 끝). */}
            {nudged ? (
              <line x1={boxX} y1={l.y0} x2={boxX} y2={l.y} stroke={l.color} strokeWidth={1} strokeOpacity={0.55} />
            ) : null}
            <rect
              x={boxX}
              y={boxY}
              width={boxW}
              height={BOX_H}
              rx={4}
              ry={4}
              fill={C.surface}
              stroke={l.color}
              strokeWidth={1.25}
            />
            <text
              x={axisRight - PAD_X}
              y={l.y}
              textAnchor="end"
              dominantBaseline="central"
              fill={l.color}
              fontSize={11}
              fontWeight={700}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {l.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}
