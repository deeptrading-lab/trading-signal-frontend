/**
 * "지금 뜨는 산업"(업종 랭킹 + 구성종목 모달) 한글 카피 — 단일 위치(i18n 여지).
 *
 * PRD `trending-sectors` §3-7 / DESIGN 핸드오프. 점검 안내 카피는 `lib/copy/market/maintenance.ts`
 * (공용) 재사용 — 본 파일은 섹션·모달 전용 문구만.
 */

/* ── 섹션 ─────────────────────────────── */
export const SECTORS_SECTION_TITLE = "지금 뜨는 산업";
export const SECTORS_SECTION_CAPTION = "업종별 등락 랭킹";
export const SECTORS_LOADING = "업종 랭킹을 불러오는 중이에요.";
export const SECTORS_EMPTY = "표시할 업종이 없어요.";

/** "N개 중 M개 상승" breadth 요약. */
export function sectorsBreadthSummary(up: number, total: number): string {
  return `${total}개 중 ${up}개 상승`;
}

/* ── 구성종목 모달 ─────────────────────────────── */
export const SECTORS_MODAL_CLOSE = "닫기";
/** 히어로 메타 "N개 종목". */
export function sectorsConstituentCount(count: number): string {
  return `대표 종목 ${count}개`;
}
export const SECTORS_MODAL_LOADING = "구성종목을 불러오는 중이에요.";
export const SECTORS_MODAL_EMPTY = "구성종목이 없어요.";

/* 정렬 세그먼트. */
export const SECTORS_SORT_RETURN = "수익률";
export const SECTORS_SORT_MARKETCAP = "시가총액";
export const SECTORS_SORT_ARIA = "구성종목 정렬 기준";

/** 행 접근성 라벨. */
export function sectorRowAria(name: string): string {
  return `${name} 구성종목 보기`;
}
export function constituentRowAria(name: string): string {
  return `${name} 상세 보기`;
}
