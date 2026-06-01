/**
 * 표면 B — 종목 상세 "수급" 섹션의 한글 노출 카피.
 *
 * PRD `investor-flow` §4.B / DESIGN.md §Components. 사용자 노출 문구의 단일 진실 원천
 * (`docs/rules/frontend.md` §5 `lib/copy/` 유지 — i18n 여지). 컴포넌트 하드코딩 금지.
 *
 * "최근 N일" 라벨로 7일 누적 오인 방지(AC-9). N 은 응답 일수로 동적 치환한다(`recentDaysLabel`).
 */

/* 섹션 제목 / 기준 라벨 */
export const STOCK_INVESTORS_TITLE = "수급 (개인·외국인·기관)";
/** 최근 N일 라벨 — N 동적 치환. 당일치는 장 종료 후 반영됨을 함께 안내. */
export function recentDaysLabel(days: number): string {
  return `최근 ${days}일(영업일) · 당일치는 장 종료 후 반영`;
}

/* 합계 요약 — 주체 라벨 */
export const STOCK_INVESTORS_SUMMARY_HEADING = "최근 N일 순매수 합계";
export const STOCK_INVESTORS_PERSON_LABEL = "개인";
export const STOCK_INVESTORS_FOREIGN_LABEL = "외국인";
export const STOCK_INVESTORS_ORG_LABEL = "기관";

/* 일자별 표 헤더 */
export const STOCK_INVESTORS_COL_DATE = "일자";
export const STOCK_INVESTORS_COL_CLOSE = "종가";
export const STOCK_INVESTORS_COL_PERSON = "개인";
export const STOCK_INVESTORS_COL_FOREIGN = "외국인";
export const STOCK_INVESTORS_COL_ORG = "기관";

/* 상태 */
export const STOCK_INVESTORS_LOADING = "수급 추이를 불러오는 중…";
export const STOCK_INVESTORS_EMPTY =
  "아직 수급 데이터가 없어요 (미집계·신규 상장).";
export const STOCK_INVESTORS_ERROR =
  "수급 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
