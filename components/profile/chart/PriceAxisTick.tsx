/**
 * PriceAxisTick — 가격 차트 우측 y축 눈금 렌더러(겹침 회피용).
 *
 * 우축 해당 가격 높이에 알약이 박히는 값들(최신가 LastPriceTag + AI 판정 레벨 라벨)은 그 가격에
 * 가장 가까운 눈금 라벨과 겹친다. 이 컴포넌트는 `hidePrices` 각 값에서 `hideThreshold`(가격 폭)
 * 이내의 눈금을 **숨겨** 알약이 그 눈금을 대체하도록 한다(증권앱 표준 동작 — 알약이 가격을 직접
 * 표시하므로 근처 일반 눈금은 중복). paint 순서와 무관하게 겹침을 원천 제거한다.
 *
 * recharts `<YAxis tick={<PriceAxisTick … />}>` 로 쓰면 x/y/payload/textAnchor 가 주입된다.
 * 색은 injected `fill`(축 stroke 로 덮임) 대신 `tickFill`(별도 prop)로 받아 테마색을 유지한다.
 */

import { fmtYAxis } from "@/lib/utils/chartFormat";

interface PriceAxisTickProps {
  /** 축 눈금 색(C.axisTick) — injected fill 과 충돌 피하려 별도 prop 으로 받음. */
  tickFill: string;
  /** 이 가격들 근처(±hideThreshold)의 눈금을 숨긴다 — 최신가 + AI 레벨. 빈 배열이면 숨김 없음. */
  hidePrices: number[];
  /** 숨김 임계값(가격 폭). 숨김 가격과의 차이가 이 값보다 작으면 눈금 숨김. */
  hideThreshold: number;
  // recharts 주입
  x?: number;
  y?: number;
  textAnchor?: "start" | "middle" | "end" | "inherit";
  payload?: { value: number };
}

export function PriceAxisTick({
  tickFill,
  hidePrices,
  hideThreshold,
  x = 0,
  y = 0,
  textAnchor,
  payload,
}: PriceAxisTickProps) {
  if (!payload) return null;
  if (
    hideThreshold > 0 &&
    hidePrices.some((p) => Math.abs(payload.value - p) < hideThreshold)
  ) {
    return null;
  }
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      fill={tickFill}
      fontSize={11}
      dominantBaseline="central"
    >
      {fmtYAxis(payload.value)}
    </text>
  );
}
