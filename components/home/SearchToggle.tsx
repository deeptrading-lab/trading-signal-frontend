/**
 * SearchToggle — 주식 / 코인 세그먼트 토글.
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `AnalysisDashboard.tsx` L14~L38 정합 — 두 버튼 분기 (주식 / 코인) + 활성 표시.
 * 활성 시 자산 식별 토큰 cascade (주식=blue/`asset-stock`, 코인=orange/`asset-coin`).
 *
 * 책임:
 *   - 현재 활성 토글 표시 + 외부에 변경 통보 (controlled — value/onChange).
 *   - 모바일 `flex-1` (풀폭) / 데스크탑 `md:flex-none` (콘텐츠 폭).
 *
 * 'use client' — onChange 콜백을 받는 클라이언트 컴포넌트 (자체 상태는 없음, 외부 controlled).
 */

"use client";

import { TrendingUp, Bitcoin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  SEARCH_TOGGLE_STOCK,
  SEARCH_TOGGLE_CRYPTO,
} from "@/lib/copy/home/labels";
import type { SearchAssetType } from "@/lib/types/home/searchOptions";

export interface SearchToggleProps {
  value: SearchAssetType;
  onChange: (next: SearchAssetType) => void;
}

export function SearchToggle({ value, onChange }: SearchToggleProps) {
  return (
    <div
      className="flex w-full md:w-auto p-xs bg-surface-muted rounded-sm"
      role="tablist"
      aria-label="자산 종류 선택"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "stock"}
        onClick={() => onChange("stock")}
        className={cn(
          "flex-1 md:flex-none inline-flex justify-center items-center gap-xs px-md h-button-primary-h rounded-sm text-body-sm-strong cursor-pointer border-0",
          value === "stock"
            ? "bg-surface text-asset-stock"
            : "bg-transparent text-text-muted",
        )}
      >
        <TrendingUp className="h-md w-md" aria-hidden="true" />
        {SEARCH_TOGGLE_STOCK}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "crypto"}
        onClick={() => onChange("crypto")}
        className={cn(
          "flex-1 md:flex-none inline-flex justify-center items-center gap-xs px-md h-button-primary-h rounded-sm text-body-sm-strong cursor-pointer border-0",
          value === "crypto"
            ? "bg-surface text-asset-coin"
            : "bg-transparent text-text-muted",
        )}
      >
        <Bitcoin className="h-md w-md" aria-hidden="true" />
        {SEARCH_TOGGLE_CRYPTO}
      </button>
    </div>
  );
}
