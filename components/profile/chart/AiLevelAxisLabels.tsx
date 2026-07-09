/**
 * AiLevelAxisLabels — AI 판정 레벨(목표/재진입·손절)을 **우측 가격 축 바깥의 전용 여백 밴드**에
 * 붙이는 커스텀 레이어. recharts v3 컨텍스트 훅(`useYAxisScale`·`usePlotArea`)으로 가격→픽셀
 * 스케일을 차트와 공유한다(VolumeProfileLayer 와 동일 — v3 은 Customized 에 축맵을 안 준다).
 *
 * 알약은 눈금 숫자·캔들과 겹치지 않게 **축 오른쪽 밴드**(차트가 `margin.right` 로 확보)에 우정렬한다.
 * 밴드 폭은 `aiLabelBandWidth(levels)` 로 상위(StockDailyChart)가 계산해 margin 과 이 컴포넌트에
 * 함께 넘긴다. 개별 ReferenceLine label 은 서로를 몰라 겹치므로, 여기서 전 레벨 픽셀 y 를 모아
 * **충돌 해소**(최소 간격 확보로 아래로 밀기, 현재가 알약 회피)하고 밀린 라벨엔 실제 선까지 연결선을
 * 그린다. 현재가(축 위·채움)와 구분되게 **아웃라인 알약**.
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
/** 알약 우측 ~ 밴드 우측 여백(px). */
const BAND_TAIL = 4;

/** 대략 글자 폭(px, fontSize 11) — CJK 는 넓게, 숫자·쉼표·공백은 좁게. */
function estimateWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 0x2e80 ? 11 : 6.2;
  return w;
}

function labelText(role: "목표" | "재진입" | "손절", price: number): string {
  return `${role} ${formatNumber(price, { digits: 0 })}`;
}

function levelTexts(levels: AiVerdictLevels): string[] {
  const texts: string[] = [];
  if (levels.target) {
    texts.push(labelText(levels.target.role === "target" ? "목표" : "재진입", levels.target.price));
  }
  texts.push(labelText("손절", levels.stop.price));
  return texts;
}

/** 알약이 들어갈 우측 밴드 폭(px) — 가장 넓은 라벨 기준. margin.right 예약·라벨 우정렬 공용. */
export function aiLabelBandWidth(levels: AiVerdictLevels): number {
  const maxText = levelTexts(levels).reduce((m, t) => Math.max(m, estimateWidth(t)), 0);
  return Math.ceil(maxText) + PAD_X * 2 + BAND_TAIL + 2;
}

export function AiLevelAxisLabels({
  levels,
  lastClose,
  bandWidth,
}: {
  levels: AiVerdictLevels;
  lastClose: number | null;
  bandWidth: number;
}) {
  const yScale = useYAxisScale();
  const plot = usePlotArea();
  const { C } = useChartThemeContext();

  if (!yScale || !plot) return null;

  const axisRight = plot.x + plot.width + CHART_AXIS_WIDTH; // 눈금 숫자 우측 끝 = 밴드 좌측
  const bandRight = axisRight + bandWidth - BAND_TAIL; // 알약 우정렬 기준(밴드 우측 여백 남김)
  const top = plot.y;
  const bottom = plot.y + plot.height;

  const labels: PlacedLabel[] = [];
  if (levels.target) {
    const isTarget = levels.target.role === "target";
    const y0 = yScale(levels.target.price);
    if (y0 != null) {
      labels.push({
        text: labelText(isTarget ? "목표" : "재진입", levels.target.price),
        color: isTarget ? C.stroke : C.refMid,
        y0,
        y: 0,
      });
    }
  }
  const stopY0 = yScale(levels.stop.price);
  if (stopY0 != null) {
    labels.push({ text: labelText("손절", levels.stop.price), color: C.down, y0: stopY0, y: 0 });
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
        const boxX = bandRight - boxW;
        const boxY = l.y - BOX_H / 2;
        return (
          <g key={i}>
            {/* 실제 선(플롯 우측 끝) → 알약(밴드) 연결선 — 눈금 위를 지나 어느 선인지 잇는다. */}
            <line
              x1={plot.x + plot.width}
              y1={l.y0}
              x2={boxX}
              y2={l.y}
              stroke={l.color}
              strokeWidth={1}
              strokeOpacity={0.45}
            />
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
              x={bandRight - PAD_X}
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
