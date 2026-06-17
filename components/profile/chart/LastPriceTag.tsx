/**
 * LastPriceTag — 가격 차트 우측 y축에 '최신 종가'를 알약(pill)으로 박는 ReferenceLine 라벨.
 *
 * recharts `<ReferenceLine label={<LastPriceTag … />}>` 로 쓰면 viewBox(기준선의 픽셀 좌표)가
 * 주입된다. 가로 기준선이라 viewBox.y = 가격선의 픽셀 y, viewBox.x + width = 플롯 우측 끝
 * (= 우측 y축이 시작되는 지점). 우측 축 영역(폭 `CHART_AXIS_WIDTH`)에 알약을 우정렬해
 * 현재가를 그 가격 높이에 표시한다 → 축 눈금 사이 실제 종가가 한눈에 보인다.
 *
 * 색은 한국식(상승 빨강 = C.stroke / 하락 파랑 = C.down)으로 상위에서 결정해 내려준다.
 */

import { formatNumber } from "@/lib/utils/formatMoney";
import { CHART_AXIS_WIDTH } from "../stockChartConfig";

interface LastPriceTagProps {
  /** 최신 종가(원). */
  price: number;
  /** 알약 배경색 — 상승/하락에 따라 상위에서 결정. */
  color: string;
  /** 외곽선 녹아웃 색 — 차트 배경(C.surface). 겹친 캔들/눈금과 경계를 또렷하게 분리. */
  bgColor: string;
  /** recharts 가 주입하는 기준선 픽셀 좌표(가로선: y=선 높이, x+width=플롯 우측 끝). */
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}

export function LastPriceTag({ price, color, bgColor, viewBox }: LastPriceTagProps) {
  if (!viewBox) return null;
  const { x = 0, y = 0, width = 0 } = viewBox;

  const text = formatNumber(price, { digits: 0 });
  const padX = 6;
  const charW = 6.4; // 11px tabular 숫자 글자 폭 추정치 — 알약 폭 산정용
  const boxW = Math.ceil(text.length * charW) + padX * 2;
  const boxH = 17;

  const axisRight = x + width + CHART_AXIS_WIDTH; // 우측 축 바깥 끝
  const boxX = axisRight - boxW; // 우정렬(긴 가격은 플롯 쪽으로 살짝 넘어감)
  const boxY = y - boxH / 2;

  return (
    <g pointerEvents="none">
      {/* 배경색 외곽선(녹아웃) — 겹치는 캔들/축 눈금과 경계를 또렷하게 분리해 가독성 확보. */}
      <rect
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={4}
        ry={4}
        fill={color}
        stroke={bgColor}
        strokeWidth={1.5}
      />
      <text
        x={axisRight - padX}
        y={y}
        textAnchor="end"
        dominantBaseline="central"
        fill="#fff"
        fontSize={11}
        fontWeight={600}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {text}
      </text>
    </g>
  );
}
