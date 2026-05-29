/**
 * `/watchlist` 화면의 한글 라벨 카피.
 *
 * 시안 `Watchlist.tsx` 정합 + PRD `watchlist-real-data` §3.7·§3.9 (검색 모달·상태 카피).
 */

export const WATCHLIST_PAGE_TITLE = "관심종목";
/** 실데이터 전환(§3.7) — "그룹" 개념 미사용(단일 목록)이라 "+ 종목 추가" 로 조정. */
export const WATCHLIST_ADD_GROUP = "+ 종목 추가";
export const WATCHLIST_TABLE_NAME = "종목명";
export const WATCHLIST_TABLE_PRICE = "현재가";
export const WATCHLIST_TABLE_CHANGE = "등락률";
export const WATCHLIST_TABLE_ACTIONS = "관리";

/** WatchlistAssetType enum 한글 매핑. */
export const ASSET_TYPE_STOCK = "주식";
export const ASSET_TYPE_CRYPTO = "코인";

/** 경고 배지(§3.6) — 거래정지 / 관리종목. */
export const WATCHLIST_BADGE_TRADE_STOPPED = "거래정지";
export const WATCHLIST_BADGE_ADMIN_ITEM = "관리종목";

/** 행별 삭제 버튼 aria. */
export const WATCHLIST_REMOVE_LABEL = "관심종목에서 제거";

/** 디그레이드 행(부분 실패) — 시세 누락 종목을 담은 채로 안내+재시도. */
export const WATCHLIST_ROW_FAILED = "시세를 불러오지 못했어요";
export const WATCHLIST_ROW_RETRY = "다시 시도";

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
export const WATCHLIST_SEARCH_EMPTY = "일치하는 종목이 없어요.";
export const WATCHLIST_SEARCH_PENDING = "검색 중…";
export const WATCHLIST_SEARCH_PROMPT = "추가할 종목을 검색해 주세요.";
export const WATCHLIST_SEARCH_ADDED = "추가됨";
