/**
 * Home 검색 토글 옵션 mock — 주식 / 코인 2개.
 *
 * 시안 `AnalysisDashboard.tsx` 의 두 토글 정합. 카피·placeholder 는
 * `lib/copy/home/labels.ts` / `lib/copy/home/placeholders.ts`.
 */

import type { SearchOption } from "@/lib/types/home/searchOptions";

export const SEARCH_OPTIONS_MOCK: SearchOption[] = [
  { type: "stock", iconName: "TrendingUp" },
  { type: "crypto", iconName: "Bitcoin" },
];
