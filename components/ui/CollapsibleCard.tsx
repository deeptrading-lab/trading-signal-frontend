/**
 * CollapsibleCard — 제목만 보이는 접힌 카드 → 헤더 탭 시 본문 펼침.
 *
 * `components/ui/` 도메인 무관 원자 컴포넌트의 첫 입주(AGENTS.md 예정 위치).
 * 모바일 종목 상세에서 기업개황·최근공시를 기본 접힘으로 보여주는 데 사용한다.
 *
 * 동작:
 *   - 기본 접힘(`defaultOpen=false`) — 제목 + 우측 chevron(아래)만 노출.
 *   - 헤더 버튼 탭 → 펼침. chevron 은 `transition-transform` 으로 180° 회전(아래↔위).
 *   - `.card` 셸 + 기존 `text-h2` 타이틀 톤 재사용(시각 무회귀).
 */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CollapsibleCardProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleCard({
  title,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="card" aria-label={title}>
      <button
        type="button"
        className="flex items-center justify-between w-full cursor-pointer"
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
