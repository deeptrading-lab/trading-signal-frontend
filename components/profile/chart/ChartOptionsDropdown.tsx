/**
 * ChartOptionsDropdown — 차트 오버레이 옵션("매물대"·"볼린저밴드") 체크박스 드롭다운.
 *
 * 배경: 오버레이가 늘수록 차트 위 토글 버튼이 많아져 모바일 툴바가 줄바꿈된다. 개별 버튼 대신
 *   "옵션 ▾" 트리거 하나 → 드롭다운 안에 체크박스로 묶는다. 선택해도 닫지 않는다(다중 토글).
 *   외부 클릭 닫힘은 공용 `useOutsideClick`(mousedown+touchstart) 사용. 패널 스타일은 `.dropdown-panel`.
 *   상태(체크값)는 상위(StockPageLayout)의 `useChartOptions` 가 소유·localStorage 지속.
 */

"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOutsideClick } from "@/hooks/utils/useOutsideClick";
import {
  CHART_OPTIONS_LABEL,
  CHART_OVERLAY_OPTIONS,
} from "@/components/profile/stockChartConfig";
import type { ChartOptions } from "@/lib/store/chart/chartOptions";

export interface ChartOptionsDropdownProps {
  options: ChartOptions;
  onToggle: (key: keyof ChartOptions) => void;
}

export function ChartOptionsDropdown({ options, onToggle }: ChartOptionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, () => setOpen(false), { enabled: open });

  const activeCount = CHART_OVERLAY_OPTIONS.filter((o) => options[o.key]).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-xs px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer border",
          activeCount > 0
            ? "bg-accent-vivid text-surface border-accent-vivid"
            : "text-text-muted border-border-line hover:text-text-strong hover:bg-surface-muted",
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {CHART_OPTIONS_LABEL}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="dropdown-panel absolute right-0 top-full z-[40] mt-xs min-w-[144px]"
          role="menu"
          aria-label="차트 옵션"
        >
          {CHART_OVERLAY_OPTIONS.map((o) => {
            const checked = options[o.key];
            return (
              <button
                key={o.key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                onClick={() => onToggle(o.key)}
                className={cn(
                  "flex w-full items-center gap-sm px-md py-sm rounded-sm text-body-sm-strong cursor-pointer text-left transition-colors",
                  checked
                    ? "text-text-strong"
                    : "text-text-muted hover:text-text-strong hover:bg-surface-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                    checked
                      ? "bg-accent-vivid border-accent-vivid text-surface"
                      : "border-border-line",
                  )}
                >
                  {checked && <Check className="h-3 w-3" aria-hidden="true" />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
