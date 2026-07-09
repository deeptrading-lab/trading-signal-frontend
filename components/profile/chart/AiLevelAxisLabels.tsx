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
import type { AiVerdictLevels } from "@/lib/utils/aiVerdictLevels";

interface PlacedLabel {
  text: string;
  /** 알약 채움색(레벨색) — 연결선 색도 공용. */
  fill: string;
  /** 글자색 — 밝은 채움(앰버)은 어두운 글자, 그 외 흰 글자(현재가 태그와 동일 톤). */
  textColor: string;
  y0: number;
  y: number;
}

/** 밝은 채움(앰버 재진입) 위 글자 — 고정 어두운색(테마 반전 토큰은 다크에서 밝아져 부적합). */
const DARK_ON_LIGHT = "#141922";

const BOX_H = 18;
const GAP = BOX_H + 2;
const PAD_X = 6;

function estimateWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 0x2e80 ? 11 : 6.2;
  return w;
}

function levelLabelTexts(levels: AiVerdictLevels): string[] {
  const texts: string[] = [];
  if (levels.target) {
    texts.push(
      `${levels.target.role === "target" ? "목표" : "재진입"} ${formatNumber(levels.target.price, { digits: 0 })}`,
    );
  }
  texts.push(`손절 ${formatNumber(levels.stop.price, { digits: 0 })}`);
  return texts;
}

/** 가장 넓은 라벨 알약의 픽셀 폭 — 상위(StockDailyChart)가 우측 여백(넘침분) 예약에 쓴다. */
export function aiLabelMaxWidth(levels: AiVerdictLevels): number {
  const maxText = levelLabelTexts(levels).reduce((m, t) => Math.max(m, estimateWidth(t)), 0);
  return Math.ceil(maxText) + PAD_X * 2;
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

  const plotRight = plot.x + plot.width; // y축 라인(플롯 우측 끝) — 알약 시작점(좌정렬)
  const top = plot.y;
  const bottom = plot.y + plot.height;

  // 역할명(목표/재진입/손절)을 붙여 현재가 라벨과 구분한다 — 현재가도 상승 빨강/하락 파랑이라 색만으론
  // 목표(빨강)·손절(파랑)과 겹친다. 현재가는 가격만 → "목표 24,300" vs "24,300" 로 텍스트 구분.
  const labels: PlacedLabel[] = [];
  if (levels.target) {
    const isTarget = levels.target.role === "target";
    const y0 = yScale(levels.target.price);
    if (y0 != null) {
      labels.push({
        text: `${isTarget ? "목표" : "재진입"} ${formatNumber(levels.target.price, { digits: 0 })}`,
        // 목표=상승색(빨강, 흰 글자) / 재진입=앰버(밝아서 어두운 글자). 회색은 안 보여서 변경.
        fill: isTarget ? C.stroke : C.signalLine,
        textColor: isTarget ? "#fff" : DARK_ON_LIGHT,
        y0,
        y: 0,
      });
    }
  }
  const stopY0 = yScale(levels.stop.price);
  if (stopY0 != null) {
    labels.push({
      text: `손절 ${formatNumber(levels.stop.price, { digits: 0 })}`,
      fill: C.down,
      textColor: "#fff",
      y0: stopY0,
      y: 0,
    });
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
        const boxX = plotRight; // 시작점=y축, 길면 오른쪽(축 바깥)으로 확장(우측 여백은 상위가 예약)
        const boxY = l.y - BOX_H / 2;
        const nudged = Math.abs(l.y - l.y0) > 1;
        return (
          <g key={i}>
            {/* 밀렸으면 실제 선 높이(y0) → 알약(y) 짧은 세로 연결선(y축 라인 위). */}
            {nudged ? (
              <line x1={plotRight} y1={l.y0} x2={plotRight} y2={l.y} stroke={l.fill} strokeWidth={1} strokeOpacity={0.55} />
            ) : null}
            {/* 현재가 태그와 동일 톤 — 레벨색 채움 + 차트면 녹아웃 테두리(뒤 UI 비침 차단). */}
            <rect
              x={boxX}
              y={boxY}
              width={boxW}
              height={BOX_H}
              rx={4}
              ry={4}
              fill={l.fill}
              stroke={C.surface}
              strokeWidth={1.5}
            />
            <text
              x={boxX + PAD_X}
              y={l.y}
              textAnchor="start"
              dominantBaseline="central"
              fill={l.textColor}
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
