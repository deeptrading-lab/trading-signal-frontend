/**
 * `/swing` 필터·시장 탭의 URL(쿼리) 매핑 — 순수 로직.
 *
 * 기본값(수급 조건 충족·전체 시장)은 쿼리 없이, 나머지만 `?tab=`·`?market=` 으로 표기한다.
 * 종목 상세로 갔다가 뒤로 와도 보던 탭이 유지된다(analyzeTab 과 같은 패턴).
 */

import type { SwingScreenerFilter } from "@/lib/types/swing/api";

export type SwingMarketFilter = "KOSPI" | "KOSDAQ" | null;

export function swingFilterFromParam(v: string | null | undefined): SwingScreenerFilter {
  return v === "excluded" || v === "all" ? v : "flow";
}

export function swingMarketFromParam(v: string | null | undefined): SwingMarketFilter {
  return v === "KOSPI" || v === "KOSDAQ" ? v : null;
}

export function swingTabHref(pathname: string, filter: SwingScreenerFilter, market: SwingMarketFilter): string {
  const q = new URLSearchParams();
  if (filter !== "flow") q.set("tab", filter);
  if (market) q.set("market", market);
  const s = q.toString();
  return s ? `${pathname}?${s}` : pathname;
}
