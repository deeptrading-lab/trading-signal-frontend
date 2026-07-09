/**
 * AiLevelTag — AI 판정 레벨(목표/재진입·손절) 기준선의 라벨 알약. LastPriceTag 자매.
 *
 * 현재가 태그(우측·채움)와 구분되게 **좌측·아웃라인**(테두리=레벨색·배경=차트면 녹아웃)으로,
 * "역할명 + 가격"을 함께 표기해 어느 선인지 바로 읽힌다(재진입/손절 등). recharts
 * `<ReferenceLine label={<AiLevelTag … />}>` 로 쓰면 viewBox(기준선 픽셀 좌표)가 주입된다.
 */

import { formatNumber } from "@/lib/utils/formatMoney";

interface AiLevelTagProps {
  /** 역할 라벨 — "목표" / "재진입" / "손절". */
  label: string;
  /** 절대가(원). */
  price: number;
  /** 테두리·글자 색(레벨색). */
  color: string;
  /** 녹아웃 배경 색(차트면 C.surface). */
  bgColor: string;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}

/** 대략적 글자 폭(px, fontSize 11) — CJK 는 넓게, 그 외(숫자·공백·쉼표)는 좁게. */
function estimateWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 0x2e80 ? 11 : 6.2;
  return w;
}

export function AiLevelTag({ label, price, color, bgColor, viewBox }: AiLevelTagProps) {
  if (!viewBox) return null;
  const { x = 0, y = 0 } = viewBox;

  const text = `${label} ${formatNumber(price, { digits: 0 })}`;
  const padX = 6;
  const boxW = Math.ceil(estimateWidth(text)) + padX * 2;
  const boxH = 17;
  const boxX = x + 2; // 플롯 좌측 끝 + 약간(현재가 우측 태그와 공간 분리).
  const boxY = y - boxH / 2;

  return (
    <g pointerEvents="none">
      <rect
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={4}
        ry={4}
        fill={bgColor}
        stroke={color}
        strokeWidth={1.25}
        fillOpacity={0.92}
      />
      <text
        x={boxX + padX}
        y={y}
        textAnchor="start"
        dominantBaseline="central"
        fill={color}
        fontSize={11}
        fontWeight={700}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {text}
      </text>
    </g>
  );
}
