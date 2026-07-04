/**
 * ChartRangeDropdown — 모바일 차트 봉·기간 선택 드롭다운(기간 1개월/3개월… 또는 분봉 간격 1분/3분…).
 *
 * 좁은 화면에서 라인·캔들 / 봉 / 기간 버튼이 한 줄에 다 들어가지 못해 줄바꿈되는 문제를 피하려고,
 * 우측 선택기를 드롭다운으로 접는다. 데스크탑은 기존 버튼 목록 유지(ChartShell 에서 분기).
 * 옵션은 `{ label, value }` 중립 목록(value 타입 제네릭) — 봉 종류(interval 문자열)·기간(days)·분봉 간격(timeframe) 모두 재사용.
 *
 * 동작: 버튼(현재 값 + chevron) 탭 → `.dropdown-panel` 목록 펼침. 옵션 선택/외부 클릭 시 닫힘.
 *   외부 클릭 닫힘 패턴은 `components/home/StockSearchContainer.tsx` 와 동일(mousedown).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ChartRangeDropdownProps<T extends string | number> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** 접근성 라벨 — 기간="기간 선택", 분봉 간격="봉 간격 선택", 봉 종류="봉 종류 선택". */
  ariaLabel?: string;
}

export function ChartRangeDropdown<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel = "기간 선택",
}: ChartRangeDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-xs px-sm py-[3px] rounded-sm text-caption font-medium bg-surface-muted text-text-strong border border-border-line cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="dropdown-panel absolute right-0 top-full z-[40] mt-xs min-w-[112px]"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-md py-sm rounded-sm text-body-sm-strong cursor-pointer text-left",
                o.value === value
                  ? "bg-surface-muted text-text-strong"
                  : "text-text-muted hover:text-text-strong hover:bg-surface-muted",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
