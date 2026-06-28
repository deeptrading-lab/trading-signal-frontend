/**
 * /analyze 상위 탭의 URL(쿼리 파라미터) 매핑 — 순수 로직.
 *
 * 기본 탭(분석 결과)은 깨끗한 경로(/analyze), 토큰 사용량만 ?tab=usage 로 표기한다.
 * 딥링크·새로고침·공유·뒤로가기가 URL 한 곳에서 일관되게 동작하도록 단일 출처를 둔다.
 */

export type AnalyzeTab = "results" | "usage";

export const ANALYZE_TAB_PARAM = "tab";
export const DEFAULT_ANALYZE_TAB: AnalyzeTab = "results";

/** URL ?tab= 값 → 탭. "usage" 외(미지정·오타 포함)는 모두 기본(results). */
export function analyzeTabFromParam(param: string | null | undefined): AnalyzeTab {
  return param === "usage" ? "usage" : DEFAULT_ANALYZE_TAB;
}

/** 탭 → href. results 는 쿼리 없는 경로, usage 만 ?tab=usage. */
export function analyzeTabHref(pathname: string, tab: AnalyzeTab): string {
  return tab === "usage" ? `${pathname}?${ANALYZE_TAB_PARAM}=usage` : pathname;
}
