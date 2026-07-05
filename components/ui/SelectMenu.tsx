/**
 * SelectMenu — 값 선택형 드롭다운(제네릭 `{ label, value }`). **아래로 펼침**(top-full) + 외부클릭 닫힘.
 *
 * 네이티브 `<select>` 는 팝업 위치를 제어할 수 없어(선택 옵션 위치에 따라 위로 겹쳐 뜸) 위치·스타일을
 * 통제해야 하는 선택기에 쓴다. 차트 봉·기간(모바일)·유저 등급 등 재사용(구 `ChartRangeDropdown` 승격).
 * `.dropdown-panel` 공용 클래스. 동작: 버튼(현재 값 + chevron) 탭 → 목록 펼침. 옵션 선택/외부 클릭 닫힘(mousedown).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectMenuProps<T extends string | number> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** 접근성 라벨. */
  ariaLabel?: string;
  /** 패널 정렬 — left(트리거 좌측 정렬·우측 펼침, 기본) / right(우측 정렬·좌측 펼침). */
  align?: "left" | "right";
  /** 비활성(처리 중 등) — 트리거 비활성 + 펼침 불가. */
  disabled?: boolean;
  /** 처리 중 — chevron 대신 스피너 + 비활성. */
  loading?: boolean;
}

export function SelectMenu<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel = "선택",
  align = "left",
  disabled = false,
  loading = false,
}: SelectMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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
        disabled={disabled || loading}
        className="flex items-center gap-xs px-sm py-[3px] rounded-sm text-caption font-medium bg-surface-muted text-text-strong border border-border-line cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={loading || undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label}
        {loading ? (
          <Loader2
            className="h-3.5 w-3.5 shrink-0 animate-spin text-text-muted"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            "dropdown-panel absolute top-full z-[40] mt-xs min-w-[112px]",
            align === "right" ? "right-0" : "left-0",
          )}
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
