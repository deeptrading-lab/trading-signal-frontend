/**
 * LastPriceTag — 가격 차트 우측 y축에 '최신 종가'를 알약(pill)으로 박는 ReferenceLine 라벨.
 *
 * recharts `<ReferenceLine label={<LastPriceTag … />}>` 로 쓰면 viewBox(기준선의 픽셀 좌표)가
 * 주입된다. 가로 기준선이라 viewBox.y = 가격선의 픽셀 y, viewBox.x + width = 플롯 우측 끝
 * (= 우측 y축이 시작되는 지점). 그 지점에 알약을 **좌정렬**해 오른쪽(축 밖)으로 확장한다 —
 * AI 레벨 라벨과 동일. 긴 가격이 플롯 쪽으로 삐져나가 캔들을 가리지 않는다(축 밖 넘침분은
 * 상위 StockDailyChart 가 margin.right 로 예약).
 *
 * 색은 한국식(상승 빨강 = C.stroke / 하락 파랑 = C.down)으로 상위에서 결정해 내려준다.
 */

import { formatNumber } from "@/lib/utils/formatMoney";

const PAD_X = 6;
const CHAR_W = 6.4; // 11px tabular 숫자 글자 폭 추정치 — 알약 폭 산정용
const BOX_H = 17;

/** 현재가 알약의 픽셀 폭 — 상위(StockDailyChart)가 우측 여백(축 밖 넘침분) 예약에 쓴다(AI 라벨과 동일 패턴). */
export function lastPriceTagWidth(price: number): number {
  const text = formatNumber(price, { digits: 0 });
  return Math.ceil(text.length * CHAR_W) + PAD_X * 2;
}

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
  const boxW = lastPriceTagWidth(price);

  // 좌정렬 — 알약 시작점 = 플롯 우측 끝(= 우측 y축 라인). 긴 가격은 축 밖(오른쪽)으로 확장한다.
  //   (AI 레벨 라벨과 동일. 이전엔 우정렬이라 긴 가격이 플롯 쪽으로 삐져나가 캔들을 가렸다.)
  const boxX = x + width;
  const boxY = y - BOX_H / 2;

  return (
    <g pointerEvents="none">
      {/* 배경색 외곽선(녹아웃) — 겹치는 캔들/축 눈금과 경계를 또렷하게 분리해 가독성 확보. */}
      <rect
        x={boxX}
        y={boxY}
        width={boxW}
        height={BOX_H}
        rx={4}
        ry={4}
        fill={color}
        stroke={bgColor}
        strokeWidth={1.5}
      />
      <text
        x={boxX + PAD_X}
        y={y}
        textAnchor="start"
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
