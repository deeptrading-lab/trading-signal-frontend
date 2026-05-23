/**
 * Home 검색 토글 옵션 — 주식 / 코인.
 *
 * 시안 `AnalysisDashboard.tsx` 의 두 토글 버튼 정합. 카피·placeholder 는
 * `lib/copy/home/placeholders.ts` / `lib/copy/home/labels.ts` 에서.
 */

export type SearchAssetType = "stock" | "crypto";

export type SearchOption = {
  type: SearchAssetType;
  /** lucide-react 아이콘 이름 (TrendingUp / Bitcoin). 컴포넌트 단에서 동적 import 매핑. */
  iconName: "TrendingUp" | "Bitcoin";
};
