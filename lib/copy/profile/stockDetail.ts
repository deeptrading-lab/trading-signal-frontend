/**
 * `/stock/[ticker]` (종목 상세) 화면의 한글 라벨 카피.
 *
 * PRD `stock-api-integration` (PR-B) §3.6 로딩·에러·빈 상태 카피 + 섹션 타이틀.
 *
 * 본 파일은 사용자 노출 한글 카피의 단일 진실 원천. mock·hook 이 본 상수를 import 한다.
 * (`docs/rules/frontend.md` §5 `lib/copy/` 유지 — i18n 도입 여지).
 */

/* 섹션 타이틀 */
export const STOCK_DETAIL_PRICE_CHART_TITLE = "가격 차트";
export const STOCK_DETAIL_COMPANY_OVERVIEW_TITLE = "기업개황";
export const STOCK_DETAIL_DISCLOSURE_LIST_TITLE = "최근 공시";

/* 로딩·에러·빈 상태 (§3.6) */
export const STOCK_DETAIL_LOADING = "불러오는 중…";
export const STOCK_DETAIL_NOT_FOUND =
  "해당 종목을 찾을 수 없습니다. 종목코드를 다시 확인해주세요.";
export const STOCK_DETAIL_MOCK_FALLBACK_NOTICE =
  "실시간 데이터 일시 연결 안 됨 — 샘플 데이터로 보고 있습니다.";

/* 기업개황 필드 라벨 */
export const COMPANY_LABEL_CEO = "대표자";
export const COMPANY_LABEL_MARKET = "시장구분";
export const COMPANY_LABEL_ESTABLISHED = "설립일";
export const COMPANY_LABEL_INDUSTRY = "업종";
export const COMPANY_LABEL_HOMEPAGE = "홈페이지";
export const COMPANY_LABEL_ADDRESS = "주소";

/* 공시 목록 컬럼 */
export const DISCLOSURE_LIST_COL_REPORT = "보고서명";
export const DISCLOSURE_LIST_COL_DATE = "접수일자";
export const DISCLOSURE_LIST_EMPTY = "최근 공시가 없습니다.";

/* 시장 구분 한글 매핑 (`CompanyProfile.market` 정합). */
export const MARKET_LABEL_KOSPI = "KOSPI";
export const MARKET_LABEL_KOSDAQ = "KOSDAQ";
export const MARKET_LABEL_KONEX = "KONEX";
export const MARKET_LABEL_OTHER = "기타";
