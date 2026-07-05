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

/* 당일 ↔ 누적 토글 (investor-flow-cumulative) */
/** 토글 — 당일 모드 버튼. */
export const FLOW_MODE_TODAY = "당일";
/** 토글 — 7일 누적 모드 버튼. */
export const FLOW_MODE_CUMULATIVE = "7일 누적";
/** 누적 컬럼 헤더 — `최근 ${N}영업일 누적`. N 은 실제 합산 일수(cumulativeDays). */
export function flowCumulativeLabel(days: number): string {
  return `최근 ${days}영업일 누적`;
}
/** 누적 적립 전(부트스트랩, cumulativeDays=0) 안내. */
export const FLOW_CUMULATIVE_COLLECTING =
  "최근 수급을 모으는 중이에요. 영업일이 쌓이면 7일 누적이 표시됩니다.";

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
/** 한 주체(외국인/기관)만 비었을 때 — 공백 대신 컬럼에 노출. */
export const FLOW_TOP10_COLUMN_EMPTY = "아직 집계 전이거나 일시적으로 못 불러왔어요.";

/* 당일 탭 점검 시 7일 누적 넛지 (market-status-aware-home §3-2, 가용성 기반 개정) */
/** 당일 unavailable(점검) 시 안내 — 항상 정상인 7일 누적으로 유도(마감 아님). */
export const FLOW_CUMULATIVE_NUDGE = "7일 누적은 계속 볼 수 있어요";
/** 넛지 인라인 링크 — 클릭 시 토글을 7일 누적으로 전환한다. */
export const FLOW_CUMULATIVE_LINK = "7일 누적 보기";
