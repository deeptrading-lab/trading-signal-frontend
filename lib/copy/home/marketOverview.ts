/**
 * 홈(`/`) 시장 종합 — 카드리스 리스킨(home-reskin) 신규 섹션 한글 카피.
 *
 * 기존 `lib/copy/home/labels.ts`(레거시 AnalysisDashboard mock)와 분리 —
 * 본 파일은 시장 종합 홈의 "실시간 랭킹" 섹션 + "AI 종합분석" 밴드 전용.
 * (i18n 여지로 `lib/copy/<domain>/` 유지 — `docs/rules/frontend.md` §lib/copy.)
 */

/** 접근성용 페이지 제목(시각 비노출 sr-only — 노스스타 홈은 페이지 타이틀 없음). */
export const HOME_PAGE_TITLE = "시장 종합";

/* ── 실시간 랭킹 섹션 ─────────────────────────────── */
export const RANK_SECTION_TITLE = "실시간";

/* 랭킹 기준 탭 — 거래량만 실배선(거래량 순위 KIS TR). 나머지는 held PR #212 대기. */
export const RANK_TAB_VOLUME = "거래량";
export const RANK_TAB_TURNOVER = "거래대금";
export const RANK_TAB_SURGE = "급상승";
export const RANK_TAB_PLUNGE = "급하락";
/** 미배선 탭 hover 안내(native title). */
export const RANK_TAB_COMING_SOON = "준비 중";

export const RANK_LOADING = "실시간 순위를 불러오는 중이에요.";
export const RANK_ERROR =
  "실시간 순위를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
export const RANK_EMPTY = "표시할 종목이 없어요.";
export const RANK_RETRY = "다시 시도";
/** 랭킹 기준 캡션(거래량 기준임을 명시). */
export const RANK_CAPTION = "거래량 기준 상위 종목";

/* 관심종목 하트 토글 aria. */
export const RANK_FAVORITE_ADD = "관심종목 추가";
export const RANK_FAVORITE_REMOVE = "관심종목에서 제거";

/* ── AI 종합분석 밴드 ─────────────────────────────── */
export const HOME_AI_TITLE = "AI 종합분석";
export const HOME_AI_DESC = "기술·수급·공시를 종합해 매수·매도 판단을 보조해요";
export const HOME_AI_ACTION = "분석 보러 가기";
