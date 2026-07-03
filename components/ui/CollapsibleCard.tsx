/**
 * CollapsibleCard — 제목만 보이는 접힘 → 헤더 탭 시 본문 펼침(온디맨드/T4).
 *
 * `components/ui/` 도메인 무관 원자. 두 variant:
 *   - `"card"`(기본): `.card` 박스 셸 + `text-h2` 타이틀. 기존 사용처 시각 무회귀.
 *   - `"flat"`(stock-detail-reskin): **카드리스** 온디맨드 행 — 헤어라인 하단선 + 우측 caret.
 *     노스스타 `.odrow` 정합. 종목 상세의 회사개요·공시·수급을 **데스크탑·모바일 공통 기본 접힘**
 *     으로 두어 "항시(헤더·차트·시그널)"만 화면에 남긴다.
 *
 * 동작(양 variant 공통):
 *   - 기본 접힘(`defaultOpen=false`) — 제목 + chevron(아래)만 노출.
 *   - 헤더 버튼 탭 → 펼침. chevron 이 180° 회전.
 *   - 본문은 `{open && children}` — **접힘 시 미마운트**(자식의 지연 패칭 보존).
 */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type CollapsibleCardVariant = "card" | "flat";

export interface CollapsibleCardProps {
  title: string;
  defaultOpen?: boolean;
  /** 셸 형태 — 기본 `"card"`(박스). `"flat"` = 카드리스 헤어라인 행(T4 온디맨드). */
  variant?: CollapsibleCardVariant;
  /** 제목 우측 부가 정보(예: 건수) — 접힘 행에서 caption 으로 노출. */
  meta?: React.ReactNode;
  children: React.ReactNode;
}

export function CollapsibleCard({
  title,
  defaultOpen = false,
  variant = "card",
  meta,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (variant === "flat") {
    return (
      <div className="border-b border-border-line">
        <button
          type="button"
          // -mx-xs/px-xs — hover 배경만 좌우 4px 번져 숨 쉬는 여백(텍스트는 콘텐츠 폭 정렬).
          //   main-area 패딩이 흡수 → 가로 스크롤 없음.
          className="-mx-xs flex w-full items-center gap-md rounded-sm px-xs py-lg text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-body-sm-strong text-text-strong">{title}</span>
          {meta != null && (
            <span className="text-caption text-text-muted">{meta}</span>
          )}
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-text-muted transition-transform duration-300",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
        {open && <div className="pb-lg">{children}</div>}
      </div>
    );
  }

  return (
    <section className="card" aria-label={title}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <h2 className="text-h2 text-text-strong">{title}</h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-text-muted transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && <div className="mt-md">{children}</div>}
    </section>
  );
}
