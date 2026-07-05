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

/* 랭킹 기준 탭 — 4종 모두 실배선(거래량순·거래대금순 = volume-rank TR / 급상승·급하락 = fluctuation TR). */
export const RANK_TAB_VOLUME = "거래량";
export const RANK_TAB_TURNOVER = "거래대금";
export const RANK_TAB_SURGE = "급상승";
export const RANK_TAB_PLUNGE = "급하락";
/** 직전 조회가 실패한 탭 hover 안내(native title) — 클릭하면 재조회로 자가 복구된다. */
export const RANK_TAB_RETRY_HINT = "다시 불러오려면 선택";

export const RANK_LOADING = "실시간 순위를 불러오는 중이에요.";
export const RANK_ERROR =
  "실시간 순위를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
export const RANK_EMPTY = "표시할 종목이 없어요.";
export const RANK_RETRY = "다시 시도";
/** 랭킹 기준 캡션 — 활성 탭별로 무엇을 기준으로 줄 세웠는지 명시. */
export const RANK_CAPTION_VOLUME = "거래량 기준 상위 종목";
export const RANK_CAPTION_TURNOVER = "거래대금 기준 상위 종목";
export const RANK_CAPTION_SURGE = "상승률 기준 상위 종목";
export const RANK_CAPTION_PLUNGE = "하락률 기준 상위 종목";

/* 관심종목 하트 토글 aria. */
export const RANK_FAVORITE_ADD = "관심종목 추가";
export const RANK_FAVORITE_REMOVE = "관심종목에서 제거";

/* ── 실시간 순위 컬럼 헤더·옵션(ranking-columns) ────── */
/* 헤더 컬럼 라벨 — ♥ 트랙은 라벨 없음. 수치 라벨은 우측 정렬(컴포넌트가 처리). */
export const RANK_COL_RANK = "순위";
export const RANK_COL_STOCK = "종목";
export const RANK_COL_SECTOR = "산업";
export const RANK_COL_PRICE = "현재가";
export const RANK_COL_CHANGE = "등락률";
export const RANK_COL_MARKETCAP = "시총";
/** 값 컬럼 헤더 — 활성 탭의 정렬 기준 값(거래량 탭=거래량 / 거래대금 탭=거래대금). md+ 노출. */
export const RANK_COL_VOLUME = "거래량";
export const RANK_COL_TURNOVER = "거래대금";

/* 위험종목 숨기기 토글 — 기본 off(opt-in). severity critical+warn 필터. */
export const RANK_RISK_HIDE_LABEL = "위험종목 숨기기";
/** 위험숨기기 on 으로 리스트가 전부 필터된 빈 상태(크래시 없음, off 로 복원). */
export const RANK_RISK_ALL_HIDDEN = "숨긴 종목뿐이에요.";

/* ── AI 종합분석 밴드 ─────────────────────────────── */
export const HOME_AI_TITLE = "AI 종합분석";
export const HOME_AI_DESC = "기술·수급·공시를 종합해 매수·매도 판단을 보조해요";
export const HOME_AI_ACTION = "분석 보러 가기";
