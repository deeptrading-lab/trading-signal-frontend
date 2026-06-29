/**
 * VolumeProfileLayer — 가격 차트 위에 매물대(가격대별 거래량) 가로 히스토그램을 겹쳐 그린다.
 *
 * recharts v3 의 차트 컨텍스트 훅으로 가격 Y축 스케일(`useYAxisScale`)과 플롯 영역
 * (`usePlotArea`)을 읽어, 가격→픽셀 변환을 가격 차트와 정확히 공유한다. (v3 에서 `Customized`
 * 는 더 이상 축맵을 주입하지 않으므로 — 이 훅들이 정석.) 차트의 직접 자식으로 렌더해야
 * 컨텍스트가 잡힌다(StockDailyChart 의 ComposedChart/AreaChart 안).
 *
 * 막대는 우측 가격축에 붙어 왼쪽으로 자라며, 길이는 최대 거래량 대비 정규화. POC(최대 거래량
 * 버킷)만 강조색. 반투명 + pointerEvents=none 이라 캔들/툴팁 위로 겹쳐도 시인성·호버를 방해하지
 * 않는다. 색은 차트 테마 컨텍스트(기존 토큰 재사용 — 신규 토큰 0).
 */

"use client";

import { useYAxisScale, usePlotArea } from "recharts";
import { useChartThemeContext } from "./ChartThemeContext";
import type { VolumeProfile } from "@/lib/utils/volumeProfile";

/** 막대 최대 길이 = 플롯 폭의 비율(우측 축에서 왼쪽으로). */
const MAX_WIDTH_RATIO = 0.3;
const BIN_OPACITY = 0.28;
const POC_OPACITY = 0.5;

const clamp = (n: number, min: number, max: number) =>
  n < min ? min : n > max ? max : n;

export function VolumeProfileLayer({ profile }: { profile: VolumeProfile }) {
  const yScale = useYAxisScale();
  const plot = usePlotArea();
  const { C } = useChartThemeContext();

  if (!yScale || !plot || profile.bins.length === 0 || profile.maxVolume <= 0) {
    return null;
  }

  const maxW = plot.width * MAX_WIDTH_RATIO;
  const rightEdge = plot.x + plot.width;
  const plotTop = plot.y;
  const plotBottom = plot.y + plot.height;

  return (
    <g className="recharts-volume-profile" pointerEvents="none" aria-hidden="true">
      {profile.bins.map((b, i) => {
        if (b.volume <= 0) return null;
        const yHigh = yScale(b.high);
        const yLow = yScale(b.low);
        if (yHigh == null || yLow == null) return null;
        // 라인 모드 등 Y도메인이 high/low 보다 좁을 때 플롯 밖으로 새지 않도록 클램프.
        const top = clamp(Math.min(yHigh, yLow), plotTop, plotBottom);
        const bot = clamp(Math.max(yHigh, yLow), plotTop, plotBottom);
        const h = bot - top - 1;
        if (h <= 0) return null;
        const w = (b.volume / profile.maxVolume) * maxW;
        if (w <= 0) return null;
        const isPoc = i === profile.pocIndex;
        return (
          <rect
            key={i}
            x={rightEdge - w}
            y={top}
            width={w}
            height={h}
            fill={isPoc ? C.rsiLine : C.axisTick}
            opacity={isPoc ? POC_OPACITY : BIN_OPACITY}
          />
        );
      })}
    </g>
  );
}
