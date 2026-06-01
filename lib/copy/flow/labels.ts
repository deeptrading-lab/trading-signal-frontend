/**
 * 표면 A — 홈 "외국인/기관 순매수 Top10" 카드의 한글 노출 카피.
 *
 * PRD `investor-flow` §4.A / DESIGN.md §Components. 사용자 노출 문구의 단일 진실 원천
 * (`docs/rules/frontend.md` §5 `lib/copy/` 유지 — i18n 여지). 컴포넌트 하드코딩 금지.
 *
 * "당일" 라벨로 7일 누적 오인 방지(AC-9). 단위 환산 접미("억원"·"주")는 포맷터 책임이지만
 * 표 헤더·빈상태 등 고정 문구는 본 파일에서 제공한다.
 */

/* 섹션 제목 / 기준 라벨 */
export const FLOW_TOP10_TITLE = "외국인·기관 순매수 Top10";
/** 당일 스냅샷임을 명시(누적 오인 방지). */
export const FLOW_TOP10_TODAY_LABEL = "당일";
/** 기준 시각 접두 — 뒤에 시각이 붙는다("기준 14:30"). */
export const FLOW_TOP10_ASOF_PREFIX = "기준";

/* 컬럼(주체) 소제목 */
export const FLOW_TOP10_FOREIGN_LABEL = "외국인";
export const FLOW_TOP10_INSTITUTION_LABEL = "기관";

/* 모바일 더보기 토글 */
export const FLOW_TOP10_SHOW_MORE = "더보기";
export const FLOW_TOP10_SHOW_LESS = "접기";

/* 상태 */
export const FLOW_TOP10_LOADING = "수급 랭킹을 불러오는 중…";
export const FLOW_TOP10_EMPTY =
  "아직 당일 외국인·기관 수급 집계 전이에요 (첫 갱신 09:30~).";
export const FLOW_TOP10_ERROR =
  "수급 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
export const FLOW_TOP10_RETRY = "다시 시도";
