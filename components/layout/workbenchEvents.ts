/**
 * 워크벤치 layout ↔ page 통신용 DOM CustomEvent 상수.
 *
 * Next.js App Router 의 layout.tsx 는 export 가 제한적이라 (`default`, `metadata`,
 * `generateMetadata` 등 정해진 키만 허용) 본 상수들을 별도 파일로 분리.
 *
 * 사용:
 *   - layout 측에서 사이드바 클릭 → window.dispatchEvent(new CustomEvent(...))
 *   - page 측에서 window.addEventListener 로 수신 → setSelectedTicker / setField / reset.
 */

import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeHistoryEntry } from "@/hooks/workbench/useWorkbenchSession";

export const WORKBENCH_SELECT_HISTORY_EVENT = "workbench:select-history";
export const WORKBENCH_SELECT_FAVORITE_EVENT = "workbench:select-favorite";
export const WORKBENCH_TICKER_CHANGE_EVENT = "workbench:ticker-change";

export type WorkbenchSelectHistoryDetail = {
  entry: AnalyzeHistoryEntry;
};
export type WorkbenchSelectFavoriteDetail = {
  item: WhitelistItem;
};
export type WorkbenchTickerChangeDetail = {
  ticker: string | null;
};
