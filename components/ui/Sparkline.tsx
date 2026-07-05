/**
 * Sparkline — 경량 SVG 라인 스파크라인(추세 미니 프리뷰).
 *
 * recharts 없이 순수 SVG `polyline` 한 줄로 그린다 — 구성종목 모달처럼 **한 화면에 수십 개**를 그릴 때
 * recharts 인스턴스 30개의 렌더 비용을 피한다(데이터는 배치로 이미 로드). 색은 구간 추세(마지막 vs 처음
 * 종가)로 상승=빨강/하락=파랑, **토큰 클래스 → `currentColor`** 로 전달(hex/px 직타 없음, 다크 자동).
 *
 * 데이터 2점 미만이면 아무것도 안 그린다(빈 공간). 가로/세로는 호출부가 컨테이너로 정한다(`w-full h-full`).
 */

import { cn } from "@/lib/utils/cn";

export interface SparklineProps {
  /** 종가 시리즈(오래된→최신). */
  data: readonly number[] | undefined;
  className?: string;
}

/** viewBox 좌표계(무단위) — 실제 크기는 컨테이너가 결정, SVG 가 비율로 스케일. */
const VB_W = 64;
const VB_H = 24;
const PAD = 2;

export function Sparkline({ data, className }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (VB_W - PAD * 2) / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = PAD + i * step;
      const y = PAD + (VB_H - PAD * 2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // 구간 추세 색 — 마지막이 처음 이상이면 상승(빨강), 아니면 하락(파랑). currentColor 로 전달.
  const up = data[data.length - 1] >= data[0];

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      className={cn(
        "block h-full w-full",
        up ? "text-signal-up" : "text-signal-down",
        className,
      )}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
