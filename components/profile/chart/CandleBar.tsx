/**
 * 캔들스틱 커스텀 shape — recharts `<Bar shape>` 용.
 *
 * Bar 에 `wickRange: [low, high]` 를 range dataKey 로 주면
 * props.y = yScale(high), props.y + props.height = yScale(low).
 * 이 scale 정보로 open/close body 와 wick 을 정확히 위치시킨다.
 */

import { C } from "./chartTheme";

export function CandleBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { open: number; close: number; high: number; low: number; isUp: boolean };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload || width <= 0 || height <= 0) return null;
  const { open, close, high, low, isUp } = payload;
  if (high < low) return null;

  const color = isUp ? C.stroke : C.macdLine;
  const scale = height / (high - low); // px per value unit
  const bodyTop = y + (high - Math.max(open, close)) * scale;
  const bodyH = Math.max(Math.abs(open - close) * scale, 1);
  const wickX = x + width / 2;
  const barW = Math.max(width - 2, 2);

  return (
    <g>
      {/* 위 꼬리 */}
      <line x1={wickX} y1={y} x2={wickX} y2={bodyTop} stroke={color} strokeWidth={1} />
      {/* 몸통 */}
      <rect x={x + 1} y={bodyTop} width={barW} height={bodyH} fill={color} />
      {/* 아래 꼬리 */}
      <line x1={wickX} y1={bodyTop + bodyH} x2={wickX} y2={y + height} stroke={color} strokeWidth={1} />
    </g>
  );
}
