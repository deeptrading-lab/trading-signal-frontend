/**
 * InfoTooltip — 라벨 옆 `?` 아이콘 hover/focus 시 설명을 띄우는 도메인 무관 툴팁.
 *
 * 네이티브 `title` 은 지연·미표시가 잦아 portal 로 body 에 fixed 렌더한다.
 * 카드(`.card`)가 overflow-hidden 이라 absolute 자식은 잘리므로 portal 이 필수.
 * 트리거 위치는 getBoundingClientRect 로 잡아 아이콘 바로 아래 가운데 정렬.
 */

"use client";

import { useState, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function InfoTooltip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  function show() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.top - 6, left: rect.left + rect.width / 2 });
  }

  function hide() {
    setCoords(null);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={coords ? id : undefined}
        className={cn(
          "inline-flex cursor-help text-text-muted transition-colors hover:text-text-strong",
          className,
        )}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <HelpCircle size={13} aria-hidden="true" />
      </button>
      {coords
        ? createPortal(
            <span
              role="tooltip"
              id={id}
              style={{ top: coords.top, left: coords.left }}
              className="pointer-events-none fixed z-[90] max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-md bg-text-strong px-sm py-xs text-caption text-surface shadow-lg"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
