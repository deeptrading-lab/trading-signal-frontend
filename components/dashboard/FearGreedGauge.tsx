/**
 * FearGreedGauge — 공포·탐욕 단일 게이지(국내/미국 공용).
 *
 * PRD `fear-greed-overhaul` — "지금 시장이 좋은지/나쁜지" 직관 전달이 목표:
 *   - 큰 점수 + /100 + 구간 배지(fng-band-*)
 *   - 전체 그라데이션 트랙(공포 파랑 → 중립 회색 → 탐욕 와인) + **현재 위치 마커**(value%)
 *   - 구간별 한 줄 한글 해석(FEAR_GREED_INTERP_*)
 *   - 출처 라벨(국내=합성 베타 / 미국=CNN)
 *
 * 상태: isLoading(스켈레톤) / unavailable(값 대신 "불러올 수 없어요" — CNN 차단 시).
 * 정적 표현 컴포넌트 — 데이터·상태는 상위(FearGreedContainer)가 주입.
 */

import { cn } from "@/lib/utils/cn";
import type { FearGreedLabel } from "@/lib/types/dashboard/fearGreed";
import {
  FEAR_GREED_EXTREME_FEAR,
  FEAR_GREED_FEAR,
  FEAR_GREED_NEUTRAL,
  FEAR_GREED_GREED,
  FEAR_GREED_EXTREME_GREED,
  FEAR_GREED_INTERP_EXTREME_FEAR,
  FEAR_GREED_INTERP_FEAR,
  FEAR_GREED_INTERP_NEUTRAL,
  FEAR_GREED_INTERP_GREED,
  FEAR_GREED_INTERP_EXTREME_GREED,
  FEAR_GREED_UNAVAILABLE,
} from "@/lib/copy/dashboard/labels";

const BAND_LABEL: Record<FearGreedLabel, string> = {
  EXTREME_FEAR: FEAR_GREED_EXTREME_FEAR,
  FEAR: FEAR_GREED_FEAR,
  NEUTRAL: FEAR_GREED_NEUTRAL,
  GREED: FEAR_GREED_GREED,
  EXTREME_GREED: FEAR_GREED_EXTREME_GREED,
};

const BAND_CLASS: Record<FearGreedLabel, string> = {
  EXTREME_FEAR: "fng-band-extreme-fear",
  FEAR: "fng-band-fear",
  NEUTRAL: "fng-band-neutral",
  GREED: "fng-band-greed",
  EXTREME_GREED: "fng-band-extreme-greed",
};

const SCORE_COLOR: Record<FearGreedLabel, string> = {
  EXTREME_FEAR: "text-fng-extreme-fear",
  FEAR: "text-fng-fear",
  NEUTRAL: "text-fng-neutral",
  GREED: "text-fng-greed",
  EXTREME_GREED: "text-fng-extreme-greed",
};

const INTERP: Record<FearGreedLabel, string> = {
  EXTREME_FEAR: FEAR_GREED_INTERP_EXTREME_FEAR,
  FEAR: FEAR_GREED_INTERP_FEAR,
  NEUTRAL: FEAR_GREED_INTERP_NEUTRAL,
  GREED: FEAR_GREED_INTERP_GREED,
  EXTREME_GREED: FEAR_GREED_INTERP_EXTREME_GREED,
};

export interface FearGreedGaugeProps {
  title: string;
  sourceLabel: string;
  value: number;
  label: FearGreedLabel;
  isLoading?: boolean;
  /** CNN 차단 등으로 실값을 못 받았을 때 — 값 대신 안내 표시. */
  unavailable?: boolean;
}

export function FearGreedGauge({
  title,
  sourceLabel,
  value,
  label,
  isLoading = false,
  unavailable = false,
}: FearGreedGaugeProps) {
  return (
    <div className="rounded-md bg-surface-muted p-lg" aria-label={title}>
      <div className="mb-sm flex items-center justify-between gap-sm">
        <span className="text-body-sm-strong text-text-strong">{title}</span>
        {!isLoading && !unavailable ? (
          <span className={BAND_CLASS[label]}>{BAND_LABEL[label]}</span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-sm" aria-busy="true">
          <div className="skeleton-line skeleton-line-narrow" />
          <div className="h-[8px] w-full rounded-pill bg-fng-track" />
        </div>
      ) : unavailable ? (
        <p className="py-md text-body-sm text-text-muted">
          {FEAR_GREED_UNAVAILABLE}
        </p>
      ) : (
        <>
          <div className="mb-xs flex items-end gap-md">
            <span
              className={cn("text-gauge-score tabular-nums", SCORE_COLOR[label])}
              aria-label={`${title} 점수 ${value}`}
            >
              {value}
            </span>
            <span className="pb-xs text-caption text-text-muted">/ 100</span>
          </div>
          <p className="mb-md text-body-sm text-text-strong">{INTERP[label]}</p>
          {/* 전체 그라데이션 트랙 + 현재 위치 마커 — 스펙트럼 위 위치를 직관적으로. */}
          <div className="relative h-[8px] w-full rounded-pill bg-gradient-to-r from-fng-extreme-fear via-fng-neutral to-fng-extreme-greed">
            <span
              className="absolute top-1/2 h-[16px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-pill bg-text-strong ring-2 ring-surface"
              style={{ left: `${Math.min(100, Math.max(0, value))}%` }}
              aria-hidden="true"
            />
          </div>
        </>
      )}

      <p className="mt-sm text-caption text-text-muted">{sourceLabel}</p>
    </div>
  );
}
