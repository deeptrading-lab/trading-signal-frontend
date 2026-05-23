/**
 * SearchBar — 자산 검색 input.
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `AnalysisDashboard.tsx` L40~L49 정합 — 좌측 돋보기 아이콘 + 텍스트 input.
 * 자산 종류 분기 placeholder (주식 / 코인) — props 로 받음 (controlled).
 *
 * 책임:
 *   - 검색어 input — controlled (value/onChange).
 *   - 자산 종류 별 placeholder cascade.
 *
 * 클라이언트:
 *   - 자체 상태 없음. 부모(HomeDashboard) 가 useState 보유.
 *   - 단, onChange / 외부 핸들러 콜백 받는 입력이므로 직접 동작 측면에서 'use client'.
 */

"use client";

import { Search } from "lucide-react";
import {
  SEARCH_PLACEHOLDER_STOCK,
  SEARCH_PLACEHOLDER_CRYPTO,
} from "@/lib/copy/home/placeholders";
import type { SearchAssetType } from "@/lib/types/home/searchOptions";

export interface SearchBarProps {
  assetType: SearchAssetType;
  value: string;
  onChange: (next: string) => void;
}

export function SearchBar({ assetType, value, onChange }: SearchBarProps) {
  const placeholder =
    assetType === "stock" ? SEARCH_PLACEHOLDER_STOCK : SEARCH_PLACEHOLDER_CRYPTO;

  return (
    <div className="relative flex-1 w-full">
      <span
        className="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-text-muted"
        aria-hidden="true"
      >
        <Search className="h-md w-md" />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input pl-2xl"
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
