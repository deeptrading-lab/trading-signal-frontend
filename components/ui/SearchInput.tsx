"use client";

/**
 * SearchInput — 공용 종목 검색 입력 (ring 래퍼 + 좌측 돋보기 + `input-search` 56px).
 *
 * 홈/종목분석(`StockSearchContainer`)·관심종목(`WatchlistSearch`)이 **동일한 검색 입력 비주얼**을
 * 공유하기 위해 추출(중복 마크업 제거). 프레젠테이션 전용 — value/onChange/포커스/aria 등 입력 속성은
 * 모두 props 로 위임한다(상위가 keyword 상태·드롭다운·바깥클릭을 소유). 입력 자체 border 는 없고
 * wrapper ring 이 단일 경계(focus 시 `accent-vivid` 2px). hex/px 직타 0 — 토큰 클래스만.
 */

import { forwardRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SearchInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { className, type = "text", autoComplete = "off", ...props },
    ref,
  ) {
    return (
      <div className="relative rounded-md shadow-sm ring-1 ring-border-line transition-all duration-150 focus-within:ring-2 focus-within:ring-accent-vivid">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-md text-text-muted"
          aria-hidden="true"
        >
          <Search className="h-5 w-5" />
        </span>
        <input
          ref={ref}
          type={type}
          autoComplete={autoComplete}
          className={cn("input-search", className)}
          {...props}
        />
      </div>
    );
  },
);
