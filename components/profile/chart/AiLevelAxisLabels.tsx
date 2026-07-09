/**
 * AiLevelAxisLabels — AI 판정 레벨(목표/재진입·손절)을 **우측 가격 축**에 현재가 태그처럼 붙이는
 * 커스텀 레이어. recharts v3 컨텍스트 훅(`useYAxisScale`·`usePlotArea`)으로 가격→픽셀 스케일을
 * 차트와 공유한다(VolumeProfileLayer 와 동일 패턴 — v3 에선 `Customized` 가 축맵을 안 준다).
 * 차트의 직접 자식으로 렌더해야 컨텍스트가 잡힌다.
 *
 * 개별 ReferenceLine label 은 서로를 몰라 가까운 레벨끼리 겹친다 → 여기서 **전 레벨 픽셀 y 를 모아
 * 충돌 해소**(최소 간격 확보로 아래로 밀기, 현재가 알약 회피)하고, 밀린 라벨엔 실제 선까지 연결선을
 * 그린다. 현재가(우측·채움)와 구분되게 **아웃라인 알약**(테두리=레벨색·배경 녹아웃).
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
  /** 실제 가격의 픽셀 y. */
  y0: number;
  /** 충돌 해소 후 알약 중심 y. */
  y: number;
}

const BOX_H = 18;
const GAP = BOX_H + 2;
const PAD_X = 6;

/** 대략 글자 폭(px, fontSize 11) — CJK 는 넓게, 숫자·쉼표·공백은 좁게. */
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
  const axisRight = plotRight + CHART_AXIS_WIDTH;
  const top = plot.y;
  const bottom = plot.y + plot.height;

  const labels: PlacedLabel[] = [];
  if (levels.target) {
    const isTarget = levels.target.role === "target";
    const y0 = yScale(levels.target.price);
    if (y0 != null) {
      labels.push({
        text: `${isTarget ? "목표" : "재진입"} ${formatNumber(levels.target.price, { digits: 0 })}`,
        color: isTarget ? C.stroke : C.refMid,
        y0,
        y: 0,
      });
    }
  }
  const stopY0 = yScale(levels.stop.price);
  if (stopY0 != null) {
    labels.push({
      text: `손절 ${formatNumber(levels.stop.price, { digits: 0 })}`,
      color: C.down,
      y0: stopY0,
      y: 0,
    });
  }
  if (labels.length === 0) return null;

  // 충돌 해소 — 이상 y(y0) 오름차순 정렬 후 최소 간격(GAP) 확보하며 아래로 밀기. 현재가 알약 회피.
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
            {nudged ? (
              <line
                x1={plotRight}
                y1={l.y0}
                x2={boxX}
                y2={l.y}
                stroke={l.color}
                strokeWidth={1}
                strokeOpacity={0.5}
              />
            ) : null}
            <rect
              x={boxX}
              y={boxY}
              width={boxW}
              height={BOX_H}
              rx={4}
              ry={4}
              fill={C.surface}
              fillOpacity={0.92}
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
