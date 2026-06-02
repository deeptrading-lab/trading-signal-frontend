/**
 * `/watchlist` 화면의 한글 라벨 카피.
 *
 * 시안 `Watchlist.tsx` 정합 + PRD `watchlist-real-data` §3.7·§3.9 (검색 모달·상태 카피).
 */

export const WATCHLIST_PAGE_TITLE = "관심종목";
/** 실데이터 전환(§3.7) — "그룹" 개념 미사용(단일 목록)이라 "+ 종목 추가" 로 조정. */
export const WATCHLIST_TABLE_NAME = "종목명";
export const WATCHLIST_TABLE_PRICE = "현재가";
export const WATCHLIST_TABLE_CHANGE = "등락률";
export const WATCHLIST_TABLE_ACTIONS = "관리";

/** 행별 삭제 버튼 aria. */
export const WATCHLIST_REMOVE_LABEL = "관심종목에서 제거";

/** 상단 단일 새로고침(`watchlist-batch-quotes` §3.4) — per-row 재시도 대체. 전체 query refetch. */
export const WATCHLIST_REFRESH = "새로고침";
/** 새로고침 진행 sr-only 안내. */
export const WATCHLIST_REFRESHING = "관심종목 시세를 새로고침하는 중";

/** 디그레이드 행(부분 실패) — 시세 누락 종목을 담은 채로 안내(전체 새로고침은 상단). */
export const WATCHLIST_ROW_FAILED = "시세를 불러오지 못했어요";
/** 시세 로딩 sr-only 안내. */
export const WATCHLIST_LOADING = "관심종목 시세를 불러오는 중";

/** 로딩 / 에러 / 빈 상태(§3.9). */
export const WATCHLIST_ERROR_TITLE =
  "관심종목 시세를 불러오지 못했어요.";
export const WATCHLIST_ERROR_HINT = "잠시 후 다시 시도해 주세요.";
export const WATCHLIST_RETRY = "다시 시도";
export const WATCHLIST_EMPTY_TITLE = "관심종목을 추가해 보세요";
export const WATCHLIST_EMPTY_HINT =
  "종목을 검색해 관심목록에 담으면 실시간 시세를 확인할 수 있어요.";
export const WATCHLIST_EMPTY_CTA = "종목 추가";

/** 검색 모달(§3.7). */
export const WATCHLIST_MODAL_TITLE = "관심종목 추가";
export const WATCHLIST_MODAL_CLOSE = "닫기";
export const WATCHLIST_SEARCH_PLACEHOLDER = "종목명·코드 입력 (예: 삼성전자, 005930)";
/** 시드 한정(대표 종목 위주) 안내 + 6자리 코드 직접 추가 경로 인지. */
export const WATCHLIST_SEARCH_EMPTY =
  "대표 종목 위주로만 검색돼요. 6자리 종목코드로도 추가할 수 있어요.";
export const WATCHLIST_SEARCH_PENDING = "검색 중…";
export const WATCHLIST_SEARCH_PROMPT = "추가할 종목을 검색해 주세요.";
/** 6자리 ticker 직접 추가(시드 미수록 보완) — `{ticker}` 치환. */
export const WATCHLIST_SEARCH_ADD_RAW = (ticker: string) => `${ticker} 직접 추가`;
/** 직접 추가 항목의 보조 라벨(코드 기반). */
export const WATCHLIST_SEARCH_RAW_META = "코드";

/** 인라인 검색(페이지 상단) — 검색 시작 전 안내. */
export const WATCHLIST_SEARCH_HINT =
  "종목을 검색해 별을 눌러 관심종목에 추가하세요.";
/** 검색 결과 별 버튼 aria — 추가/제거 토글. */
export const WATCHLIST_STAR_ADD = "관심종목에 추가";
export const WATCHLIST_STAR_REMOVE = "관심종목에서 제거";
