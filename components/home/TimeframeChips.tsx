/**
 * TimeframeChips — 차트 타임프레임 칩 그룹 (1D / 1W / 1M / 3M / 1Y / ALL).
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `AnalysisDashboard.tsx` L81~L94 정합 — 6 칩 가로 스크롤(`overflow-x-auto`) + 활성 강조.
 *
 * 책임:
 *   - 6 옵션 표시 — `lib/mock/home/timeframes.ts` mock 주입.
 *   - 활성 칩 — 외부 controlled (value/onChange). 본 PR6 의 차트는 동일 mock 만 사용
 *     (타임프레임 별 데이터 분기는 후속 BE 연결 PRD 범위).
 *
 * 'use client' — onChange 콜백을 받는 클라이언트 컴포넌트.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import type { Timeframe, TimeframeOption } from "@/lib/types/home/timeframes";

export interface TimeframeChipsProps {
  options: TimeframeOption[];
  value: Timeframe;
  onChange: (next: Timeframe) => void;
}

export function TimeframeChips({
  options,
  value,
  onChange,
}: TimeframeChipsProps) {
  return (
    <div
      className="flex items-center gap-xs overflow-x-auto pb-xs md:pb-0"
      role="tablist"
      aria-label="차트 기간 선택"
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={cn(
              "px-md h-button-sm-h rounded-sm text-button-sm whitespace-nowrap cursor-pointer border-0",
              active
                ? "bg-text-strong text-surface"
                : "bg-surface text-text-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
